import { appModule } from "../../src/app.module.js";
import { yoga } from "../../src/graphql/yoga.js";

const getPool = () => appModule.databaseService.getPool();
const resetPubSub = () => appModule.pubSubService.reset();
const resetStepsQueryCount = () =>
  appModule.releasesModule.releasesRepository.resetStepsQueryCount();

export const CLIENT_A = "client-a";
export const CLIENT_B = "client-b";

type GraphQLResult = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; extensions?: { code?: string; field?: string } }>;
};

export async function truncateReleases(): Promise<void> {
  await getPool().query("TRUNCATE release CASCADE");
}

export async function resetState(): Promise<void> {
  resetPubSub();
  resetStepsQueryCount();
  await truncateReleases();
}

export async function gql(query: string, variables?: Record<string, unknown>): Promise<GraphQLResult> {
  const response = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return response.json() as Promise<GraphQLResult>;
}

export async function counts(): Promise<{ releases: number; steps: number }> {
  const result = await getPool().query(
    `SELECT
       (SELECT count(*)::int FROM release) AS releases,
       (SELECT count(*)::int FROM release_step) AS steps`,
  );
  return result.rows[0];
}

const RELEASE_FIELDS = `
  id
  name
  dueDate
  notes
  status
  steps { key label completed }
`;

export const CREATE_RELEASE = `
  mutation Create($name: String!, $dueDate: String!, $notes: String, $clientId: String!) {
    createRelease(name: $name, dueDate: $dueDate, notes: $notes, clientId: $clientId) {
      ${RELEASE_FIELDS}
    }
  }
`;

export const SET_STEP = `
  mutation SetStep($releaseId: ID!, $stepKey: StepKey!, $completed: Boolean!, $clientId: String!) {
    setStepCompleted(releaseId: $releaseId, stepKey: $stepKey, completed: $completed, clientId: $clientId) {
      ${RELEASE_FIELDS}
    }
  }
`;

export const UPDATE_NOTES = `
  mutation Notes($id: ID!, $notes: String, $clientId: String!) {
    updateReleaseNotes(id: $id, notes: $notes, clientId: $clientId) {
      ${RELEASE_FIELDS}
    }
  }
`;

export const DELETE_RELEASE = `
  mutation Delete($id: ID!, $clientId: String!) {
    deleteRelease(id: $id, clientId: $clientId)
  }
`;

export const RELEASES = `
  query Releases {
    releases { ${RELEASE_FIELDS} }
  }
`;

export const RELEASE = `
  query Release($id: ID!) {
    release(id: $id) { ${RELEASE_FIELDS} }
  }
`;

export async function createSample(overrides: { name?: string; dueDate?: string; notes?: string | null } = {}) {
  const result = await gql(CREATE_RELEASE, {
    name: overrides.name ?? "Version 1.0.1",
    dueDate: overrides.dueDate ?? "2022-09-20",
    notes: overrides.notes === undefined ? "Ship notes" : overrides.notes,
    clientId: CLIENT_A,
  });
  const release = result.data?.createRelease as { id: string; steps: Array<{ key: string; completed: boolean }> };
  if (!release) {
    throw new Error(JSON.stringify(result.errors));
  }
  return release;
}

type ReleaseChangeEvent = {
  releaseId: string;
  kind: string;
  stepKey: string | null;
  completed: boolean | null;
  sourceClientId: string;
};

export async function openSubscription() {
  const response = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `subscription {
        releaseChanged {
          releaseId
          kind
          stepKey
          completed
          sourceClientId
        }
      }`,
    }),
  });
  if (!response.body) {
    throw new Error("Subscription response has no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return {
    async nextChange(timeoutMs = 4000): Promise<ReleaseChangeEvent> {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const remaining = timeoutMs - (Date.now() - started);
        const { value, done } = await Promise.race([
          reader.read(),
          new Promise<never>((_resolve, reject) => {
            setTimeout(() => reject(new Error("Timed out waiting for a release change")), remaining);
          }),
        ]);
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) {
            continue;
          }
          const payload = JSON.parse(dataLine.slice("data:".length).trim()) as {
            data?: { releaseChanged?: ReleaseChangeEvent };
          };
          if (payload.data?.releaseChanged) {
            return payload.data.releaseChanged;
          }
        }
      }
      throw new Error("Timed out waiting for a release change");
    },
    async cancel() {
      await reader.cancel();
    },
  };
}
