import type { DatabaseService } from "../../database/database.service.js";
import { badUserInput, notFound } from "../../common/exceptions/graphql.exception.js";
import type { ChangeKind, PubSubService } from "../../graphql/pubsub.service.js";
import type {
  CreateReleaseDto,
  DeleteReleaseDto,
  SetStepCompletedDto,
  UpdateReleaseNotesDto,
} from "../dto/release.dto.js";
import type { Release, ReleaseRecord, Step, StepRecord } from "../entities/release.entity.js";
import type { ReleaseStatusService } from "./release-status.service.js";
import type { ReleasesRepository } from "../repository/releases.repository.js";
import { compareStepKeys, stepLabel } from "../steps.constants.js";

const DUPLICATE_NAME = "A release with this name already exists.";

function duplicateReleaseName() {
  return badUserInput("name", DUPLICATE_NAME);
}

function isUniqueNameViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export class ReleasesService {
  constructor(
    private readonly releasesRepository: ReleasesRepository,
    private readonly databaseService: DatabaseService,
    private readonly pubSubService: PubSubService,
    private readonly releaseStatusService: ReleaseStatusService,
  ) {}

  async create(input: CreateReleaseDto): Promise<Release> {
    const release = await this.databaseService.withTransaction(async (client) => {
      if (await this.releasesRepository.nameTaken(client, input.name)) {
        throw duplicateReleaseName();
      }
      let row: ReleaseRecord;
      try {
        row = await this.releasesRepository.create(client, input);
      } catch (error) {
        if (isUniqueNameViolation(error)) {
          throw duplicateReleaseName();
        }
        throw error;
      }
      await this.releasesRepository.createSteps(client, row.id);
      const steps = await this.releasesRepository.findStepsByReleaseIds([row.id], { client });
      return this.toRelease(row, this.toSteps(steps));
    });
    this.pubSubService.publish({
      releaseId: release.id,
      kind: "RELEASE_CREATED",
      sourceClientId: input.clientId,
    });
    return release;
  }

  async findAll(): Promise<Release[]> {
    const rows = await this.releasesRepository.findAll();
    const steps = await this.releasesRepository.findStepsByReleaseIds(
      rows.map((row) => row.id),
      { track: true },
    );
    const byRelease = new Map<string, StepRecord[]>();
    for (const step of steps) {
      const group = byRelease.get(step.releaseId) ?? [];
      group.push(step);
      byRelease.set(step.releaseId, group);
    }
    return rows.map((row) => this.toRelease(row, this.toSteps(byRelease.get(row.id) ?? [])));
  }

  async findOne(id: string): Promise<Release | null> {
    const row = await this.releasesRepository.findById(this.databaseService.getPool(), id);
    if (!row) {
      return null;
    }
    return this.withSteps(row);
  }

  async setStepCompleted(input: SetStepCompletedDto): Promise<Release> {
    const release = await this.databaseService.withTransaction(async (client) => {
      const count = await this.releasesRepository.setStepCompleted(
        client,
        input.releaseId,
        input.stepKey,
        input.completed,
      );
      if (count !== 1) {
        throw notFound("Release or step not found");
      }
      const row = await this.releasesRepository.findById(client, input.releaseId);
      if (!row) {
        throw notFound("Release not found");
      }
      const steps = await this.releasesRepository.findStepsByReleaseIds([input.releaseId], {
        client,
      });
      return this.toRelease(row, this.toSteps(steps));
    });
    this.pubSubService.publish({
      releaseId: input.releaseId,
      kind: "STEP_CHANGED" satisfies ChangeKind,
      stepKey: input.stepKey,
      completed: input.completed,
      sourceClientId: input.clientId,
    });
    return release;
  }

  async updateNotes(input: UpdateReleaseNotesDto): Promise<Release> {
    const row = await this.releasesRepository.updateNotes(input.id, input.notes);
    if (!row) {
      throw notFound("Release not found");
    }
    this.pubSubService.publish({
      releaseId: input.id,
      kind: "NOTES_CHANGED",
      sourceClientId: input.clientId,
    });
    return this.withSteps(row);
  }

  async remove(input: DeleteReleaseDto): Promise<boolean> {
    const deleted = await this.releasesRepository.delete(input.id);
    if (!deleted) {
      throw notFound("Release not found");
    }
    this.pubSubService.publish({
      releaseId: input.id,
      kind: "RELEASE_DELETED",
      sourceClientId: input.clientId,
    });
    return true;
  }

  private async withSteps(row: ReleaseRecord): Promise<Release> {
    const steps = await this.releasesRepository.findStepsByReleaseIds([row.id]);
    return this.toRelease(row, this.toSteps(steps));
  }

  private toSteps(rows: StepRecord[]): Step[] {
    return [...rows]
      .sort((left, right) => compareStepKeys(left.stepKey, right.stepKey))
      .map((row) => ({
        key: row.stepKey,
        label: stepLabel(row.stepKey),
        completed: row.completed,
      }));
  }

  private toRelease(row: ReleaseRecord, steps: Step[]): Release {
    const completedCount = steps.filter((step) => step.completed).length;
    return {
      id: row.id,
      name: row.name,
      dueDate: row.dueDate,
      notes: row.notes,
      status: this.releaseStatusService.fromCompletedCount(completedCount),
      steps,
    };
  }
}
