import { createClient as createSSEClient } from "graphql-sse";
import { Client, cacheExchange, fetchExchange, subscriptionExchange } from "urql";

export const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

export const RECONNECT_EVENT = "releasecheck:reconnect";

const sseClient = createSSEClient({
  url: graphqlUrl,
  on: {
    connected: () => {
      if (typeof window === "undefined") {
        return;
      }
      if (sseClientHasConnected) {
        window.dispatchEvent(new Event(RECONNECT_EVENT));
      }
      sseClientHasConnected = true;
    },
  },
});

let sseClientHasConnected = false;

export const client = new Client({
  url: graphqlUrl,
  exchanges: [
    cacheExchange,
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
