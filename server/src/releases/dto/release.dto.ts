export type CreateReleaseDto = {
  name: string;
  dueDate: string;
  notes: string | null;
  clientId: string;
};

export type SetStepCompletedDto = {
  releaseId: string;
  stepKey: string;
  completed: boolean;
  clientId: string;
};

export type UpdateReleaseNotesDto = {
  id: string;
  notes: string | null;
  clientId: string;
};

export type DeleteReleaseDto = {
  id: string;
  clientId: string;
};
