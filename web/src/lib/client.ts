import { createClient as createSSEClient } from "graphql-sse";
import {
  Client,
  cacheExchange,
  fetchExchange,
  getOperationName,
  mapExchange,
  subscriptionExchange,
} from "urql";

export const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

export const RECONNECT_EVENT = "releasecheck:reconnect";

const sseClient = createSSEClient({
  url: graphqlUrl,
  on: {
    connected: (reconnected) => {
      if (!reconnected || typeof window === "undefined") {
        return;
      }
      window.dispatchEvent(new Event(RECONNECT_EVENT));
    },
  },
});

function withoutTypenames(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => withoutTypenames(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "__typename") {
      continue;
    }
    next[key] = withoutTypenames(child);
  }
  return next;
}

const keepReleaseList = mapExchange({
  onResult(result) {
    if (result.operation.kind !== "mutation") {
      return result;
    }
    const query = result.operation.query;
    if (!("definitions" in query)) {
      return result;
    }
    const name = getOperationName(query);
    if (name !== "SetStep" && name !== "UpdateNotes") {
      return result;
    }
    return { ...result, data: withoutTypenames(result.data) };
  },
});

export const client = new Client({
  url: graphqlUrl,
  exchanges: [
    cacheExchange,
    keepReleaseList,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query ?? "" };
        return {
          subscribe: (sink) => {
            const unsubscribe = sseClient.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }),
  ],
});
