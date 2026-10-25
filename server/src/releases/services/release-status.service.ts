export type ReleaseStatus = "PLANNED" | "ONGOING" | "DONE";

const STEP_COUNT = 7;

export class ReleaseStatusService {
  fromCompletedCount(completedCount: number): ReleaseStatus {
    if (completedCount <= 0) {
      return "PLANNED";
    }
    if (completedCount >= STEP_COUNT) {
      return "DONE";
    }
    return "ONGOING";
  }
}
