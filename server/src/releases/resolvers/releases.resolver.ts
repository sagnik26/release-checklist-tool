import type { ValidationPipe } from "../../common/validators/validation.pipe.js";
import type { PubSubService } from "../../graphql/pubsub.service.js";
import type { ReleasesService } from "../services/releases.service.js";

export class ReleasesResolver {
  constructor(
    private readonly releasesService: ReleasesService,
    private readonly validationPipe: ValidationPipe,
    private readonly pubSubService: PubSubService,
  ) {}

  createResolvers() {
    return {
      Query: {
        releases: () => this.releasesService.findAll(),
        release: (_parent: unknown, args: { id: string }) => {
          this.validationPipe.uuid(args.id, "id");
          return this.releasesService.findOne(args.id);
        },
      },
      Mutation: {
        createRelease: (
          _parent: unknown,
          args: { name: string; dueDate: string; notes?: string | null; clientId: string },
        ) =>
          this.releasesService.create({
            name: this.validationPipe.name(args.name),
            dueDate: this.validationPipe.dueDate(args.dueDate),
            notes: this.validationPipe.notes(args.notes),
            clientId: this.validationPipe.clientId(args.clientId),
          }),
        setStepCompleted: (
          _parent: unknown,
          args: { releaseId: string; stepKey: string; completed: boolean; clientId: string },
        ) =>
          this.releasesService.setStepCompleted({
            releaseId: this.validationPipe.uuid(args.releaseId, "releaseId"),
            stepKey: args.stepKey,
            completed: args.completed,
            clientId: this.validationPipe.clientId(args.clientId),
          }),
        updateReleaseNotes: (
          _parent: unknown,
          args: { id: string; notes?: string | null; clientId: string },
        ) =>
          this.releasesService.updateNotes({
            id: this.validationPipe.uuid(args.id, "id"),
            notes: this.validationPipe.notes(args.notes),
            clientId: this.validationPipe.clientId(args.clientId),
          }),
        deleteRelease: (_parent: unknown, args: { id: string; clientId: string }) =>
          this.releasesService.remove({
            id: this.validationPipe.uuid(args.id, "id"),
            clientId: this.validationPipe.clientId(args.clientId),
          }),
      },
      Subscription: {
        releaseChanged: {
          subscribe: () => this.pubSubService.subscribe(),
          resolve: (payload: unknown) => payload,
        },
      },
    };
  }
}
