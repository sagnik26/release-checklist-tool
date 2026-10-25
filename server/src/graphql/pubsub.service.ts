import { createPubSub } from "graphql-yoga";

export type ChangeKind =
  | "STEP_CHANGED"
  | "NOTES_CHANGED"
  | "RELEASE_CREATED"
  | "RELEASE_DELETED";

export type ReleaseChange = {
  releaseId: string;
  kind: ChangeKind;
  stepKey?: string | null;
  completed?: boolean | null;
  sourceClientId: string;
};

type Events = {
  releaseChanged: [change: ReleaseChange];
};

export class PubSubService {
  private pubSub = createPubSub<Events>();

  publish(change: ReleaseChange): void {
    this.pubSub.publish("releaseChanged", change);
  }

  subscribe(): AsyncIterable<ReleaseChange> {
    return this.pubSub.subscribe("releaseChanged");
  }

  reset(): void {
    this.pubSub = createPubSub<Events>();
  }
}
