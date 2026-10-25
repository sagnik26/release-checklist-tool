import { beforeEach, describe, expect, it } from "vitest";
import { appModule } from "../../src/app.module.js";
import { STEP_DEFINITIONS } from "../../src/releases/steps.constants.js";

const getPool = () => appModule.databaseService.getPool();
const readStepsQueryCount = () =>
  appModule.releasesModule.releasesRepository.readStepsQueryCount();
import {
  CLIENT_A,
  CREATE_RELEASE,
  DELETE_RELEASE,
  RELEASE,
  RELEASES,
  SET_STEP,
  UPDATE_NOTES,
  counts,
  createSample,
  gql,
  resetState,
} from "./graphql.js";

beforeEach(async () => {
  await resetState();
});

describe("createRelease", () => {
  it("inserts a planned release with seven unchecked steps", async () => {
    const result = await gql(CREATE_RELEASE, {
      name: "Version 1.0.1",
      dueDate: "2022-09-20",
      notes: "Ship notes",
      clientId: CLIENT_A,
    });
    const release = result.data?.createRelease as {
      status: string;
      notes: string;
      steps: Array<{ key: string; completed: boolean; label: string }>;
    };
    expect(result.errors).toBeUndefined();
    expect(release.status).toBe("PLANNED");
    expect(release.notes).toBe("Ship notes");
    expect(release.steps).toHaveLength(7);
    expect(release.steps.every((step) => step.completed === false)).toBe(true);
    expect(release.steps.map((step) => step.key)).toEqual(STEP_DEFINITIONS.map((step) => step.key));
    expect(release.steps.map((step) => step.label)).toEqual(STEP_DEFINITIONS.map((step) => step.label));
    expect(await counts()).toEqual({ releases: 1, steps: 7 });
  });

  it("rejects an empty name and writes nothing", async () => {
    const result = await gql(CREATE_RELEASE, {
      name: "   ",
      dueDate: "2022-09-20",
      notes: null,
      clientId: CLIENT_A,
    });
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(result.errors?.[0]?.extensions?.field).toBe("name");
    expect(await counts()).toEqual({ releases: 0, steps: 0 });
  });

  it("accepts a past due date", async () => {
    const release = await createSample({ dueDate: "2020-01-15" });
    expect(release.id).toBeTruthy();
  });
});

describe("releases and release", () => {
  it("returns an empty list", async () => {
    const result = await gql(RELEASES);
    expect(result.data?.releases).toEqual([]);
  });

  it("returns null for an unknown id", async () => {
    const result = await gql(RELEASE, { id: "4f6b1c2e-8a0d-4c3b-9e1f-2a7b6c5d4e3f" });
    expect(result.errors).toBeUndefined();
    expect(result.data?.release).toBeNull();
  });

  it("sorts by due date then name and loads steps in one query", async () => {
    await createSample({ name: "Zebra", dueDate: "2024-01-01" });
    await createSample({ name: "Alpha", dueDate: "2024-01-01" });
    await createSample({ name: "Middle", dueDate: "2023-05-01" });
    for (let index = 0; index < 7; index += 1) {
      const month = String(index + 1).padStart(2, "0");
      await createSample({ name: `Extra ${index}`, dueDate: `2025-${month}-01` });
    }
    const before = readStepsQueryCount();
    const result = await gql(RELEASES);
    const releases = result.data?.releases as Array<{ name: string; steps: unknown[] }>;
    expect(releases).toHaveLength(10);
    expect(releases.map((release) => release.name)).toEqual([
      "Middle",
      "Alpha",
      "Zebra",
      "Extra 0",
      "Extra 1",
      "Extra 2",
      "Extra 3",
      "Extra 4",
      "Extra 5",
      "Extra 6",
    ]);
    expect(releases.reduce((sum, release) => sum + release.steps.length, 0)).toBe(70);
    expect(readStepsQueryCount() - before).toBe(1);
  });
});

describe("setStepCompleted", () => {
  it("moves a release to ONGOING when the first step is checked", async () => {
    const created = await createSample();
    const result = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    const release = result.data?.setStepCompleted as {
      status: string;
      steps: Array<{ key: string; completed: boolean }>;
    };
    expect(release.status).toBe("ONGOING");
    expect(release.steps.find((step) => step.key === "merged_prs")?.completed).toBe(true);
  });

  it("moves a release to DONE when the last step is checked", async () => {
    const created = await createSample();
    for (const step of STEP_DEFINITIONS.slice(0, 6)) {
      await gql(SET_STEP, {
        releaseId: created.id,
        stepKey: step.key,
        completed: true,
        clientId: CLIENT_A,
      });
    }
    const result = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "deployed_production",
      completed: true,
      clientId: CLIENT_A,
    });
    const release = result.data?.setStepCompleted as { status: string; steps: Array<{ completed: boolean }> };
    expect(release.status).toBe("DONE");
    expect(release.steps.every((step) => step.completed)).toBe(true);
  });

  it("accepts setting the same step to true twice", async () => {
    const created = await createSample();
    const first = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    const second = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    expect(first.errors).toBeUndefined();
    expect(second.errors).toBeUndefined();
    const row = await getPool().query(
      `SELECT count(*)::int AS count FROM release_step WHERE release_id = $1 AND step_key = 'merged_prs' AND completed = true`,
      [created.id],
    );
    expect(row.rows[0].count).toBe(1);
  });

  it("unchecks a step and recomputes status", async () => {
    const created = await createSample();
    await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    const result = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: false,
      clientId: CLIENT_A,
    });
    const release = result.data?.setStepCompleted as { status: string };
    expect(release.status).toBe("PLANNED");
    const row = await getPool().query(
      `SELECT completed FROM release_step WHERE release_id = $1 AND step_key = 'merged_prs'`,
      [created.id],
    );
    expect(row.rows[0].completed).toBe(false);
  });

  it("returns NOT_FOUND for a deleted release", async () => {
    const created = await createSample();
    await gql(DELETE_RELEASE, { id: created.id, clientId: CLIENT_A });
    const result = await gql(SET_STEP, {
      releaseId: created.id,
      stepKey: "merged_prs",
      completed: true,
      clientId: CLIENT_A,
    });
    expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    expect(await counts()).toEqual({ releases: 0, steps: 0 });
  });

  it("rejects an unknown step key before the resolver", async () => {
    const created = await createSample();
    const result = await gql(
      `mutation { setStepCompleted(releaseId: "${created.id}", stepKey: not_a_step, completed: true, clientId: "${CLIENT_A}") { id } }`,
    );
    expect(result.errors?.[0]?.message).toMatch(/not_a_step|StepKey|Value/i);
  });
});

describe("updateReleaseNotes", () => {
  it("stores blank notes as null", async () => {
    const created = await createSample();
    const result = await gql(UPDATE_NOTES, { id: created.id, notes: "", clientId: CLIENT_A });
    expect((result.data?.updateReleaseNotes as { notes: string | null }).notes).toBeNull();
    const row = await getPool().query(`SELECT notes FROM release WHERE id = $1`, [created.id]);
    expect(row.rows[0].notes).toBeNull();
  });

  it("returns NOT_FOUND when the release is gone", async () => {
    const created = await createSample();
    await gql(DELETE_RELEASE, { id: created.id, clientId: CLIENT_A });
    const result = await gql(UPDATE_NOTES, { id: created.id, notes: "later", clientId: CLIENT_A });
    expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
  });
});

describe("deleteRelease", () => {
  it("removes the release and its steps", async () => {
    const created = await createSample();
    const result = await gql(DELETE_RELEASE, { id: created.id, clientId: CLIENT_A });
    expect(result.data?.deleteRelease).toBe(true);
    expect(await counts()).toEqual({ releases: 0, steps: 0 });
  });

  it("returns NOT_FOUND the second time", async () => {
    const created = await createSample();
    await gql(DELETE_RELEASE, { id: created.id, clientId: CLIENT_A });
    const result = await gql(DELETE_RELEASE, { id: created.id, clientId: CLIENT_A });
    expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
  });
});
