import { describe, expect, it } from "vitest";
import { ReleaseStatusService } from "../../src/releases/services/release-status.service.js";

const releaseStatusService = new ReleaseStatusService();

describe("ReleaseStatusService", () => {
  it("returns PLANNED when no steps are complete", () => {
    expect(releaseStatusService.fromCompletedCount(0)).toBe("PLANNED");
  });

  it("returns ONGOING for one to six completed steps", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      expect(releaseStatusService.fromCompletedCount(count)).toBe("ONGOING");
    }
  });

  it("returns DONE when all seven steps are complete", () => {
    expect(releaseStatusService.fromCompletedCount(7)).toBe("DONE");
  });
});
