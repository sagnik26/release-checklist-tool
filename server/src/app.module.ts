import { ValidationPipe } from "./common/validators/validation.pipe.js";
import { DatabaseService } from "./database/database.service.js";
import { PubSubService } from "./graphql/pubsub.service.js";
import { ReleasesModule } from "./releases/releases.module.js";

export class AppModule {
  readonly databaseService = new DatabaseService();
  readonly pubSubService = new PubSubService();
  readonly validationPipe = new ValidationPipe();
  readonly releasesModule = new ReleasesModule(
    this.databaseService,
    this.pubSubService,
    this.validationPipe,
  );
}

export const appModule = new AppModule();
