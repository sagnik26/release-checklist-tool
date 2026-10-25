import type { ReleaseStatus } from "../services/release-status.service.js";
import type { StepKey } from "../steps.constants.js";

export type ReleaseRecord = {
  id: string;
  name: string;
  dueDate: string;
  notes: string | null;
  createdAt: Date;
};

export type StepRecord = {
  releaseId: string;
  stepKey: string;
  completed: boolean;
};

export type Step = {
  key: StepKey | string;
  label: string;
  completed: boolean;
};

export type Release = {
  id: string;
  name: string;
  dueDate: string;
  notes: string | null;
  status: ReleaseStatus;
  steps: Step[];
};
