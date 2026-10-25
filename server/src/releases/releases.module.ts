import type { DatabaseService } from "../database/database.service.js";
import type { ValidationPipe } from "../common/validators/validation.pipe.js";
import type { PubSubService } from "../graphql/pubsub.service.js";
import { ReleasesRepository } from "./repository/releases.repository.js";
import { ReleasesResolver } from "./resolvers/releases.resolver.js";
import { ReleaseStatusService } from "./services/release-status.service.js";
import { ReleasesService } from "./services/releases.service.js";

export class ReleasesModule {
  readonly releaseStatusService: ReleaseStatusService;
  readonly releasesRepository: ReleasesRepository;
  readonly releasesService: ReleasesService;
  readonly releasesResolver: ReleasesResolver;

  constructor(
    databaseService: DatabaseService,
    pubSubService: PubSubService,
    validationPipe: ValidationPipe,
  ) {
    this.releaseStatusService = new ReleaseStatusService();
    this.releasesRepository = new ReleasesRepository(databaseService);
    this.releasesService = new ReleasesService(
      this.releasesRepository,
      databaseService,
      pubSubService,
      this.releaseStatusService,
    );
    this.releasesResolver = new ReleasesResolver(
      this.releasesService,
      validationPipe,
      pubSubService,
    );
  }
}
