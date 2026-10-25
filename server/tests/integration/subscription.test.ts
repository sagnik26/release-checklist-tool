import { beforeEach, describe, expect, it } from "vitest";
import { CREATE_RELEASE, SET_STEP, CLIENT_A, CLIENT_B, createSample, gql, openSubscription, resetState } from "./graphql.js";

beforeEach(async () => {
  await resetState();
});

describe("releaseChanged", () => {
  it("delivers a step change from another client", async () => {
    const created = await createSample();
    const subscription = await openSubscription();
    const pending = subscription.nextChange();
    await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "tests_passing",
      completed: true,
      clientId: CLIENT_B,
    });
    const event = await pending;
    expect(event.kind).toBe("STEP_CHANGED");
    expect(event.stepKey).toBe("tests_passing");
    expect(event.completed).toBe(true);
    expect(event.sourceClientId).toBe(CLIENT_B);
    expect(event.releaseId).toBe(created.id);
    await subscription.cancel();
  });

  it("delivers an event the originating client can ignore", async () => {
    const created = await createSample();
    const subscription = await openSubscription();
    const pending = subscription.nextChange();
    await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    const event = await pending;
    expect(event.sourceClientId).toBe(CLIENT_A);
    const shownToOriginatingTab = event.sourceClientId !== CLIENT_A;
    expect(shownToOriginatingTab).toBe(false);
    await subscription.cancel();
  });

  it("publishes nothing when validation fails", async () => {
    const subscription = await openSubscription();
    const failed = await gql(CREATE_RELEASE, {
      name: "   ",
      dueDate: "2022-09-20",
      notes: null,
      clientId: CLIENT_B,
    });
    expect(failed.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const pending = subscription.nextChange();
    const created = await createSample({ name: "After failure" });
    const event = await pending;
    expect(event.kind).toBe("RELEASE_CREATED");
    expect(event.releaseId).toBe(created.id);
    await subscription.cancel();
  });
});
