import { readFileSync } from "node:fs";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { appModule } from "../app.module.js";
import { expectedClientError } from "../utils/expected-client-error.js";

const typeDefs = readFileSync(new URL("./schema.graphql", import.meta.url), "utf8");

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers: appModule.releasesModule.releasesResolver.createResolvers(),
  }),
  graphqlEndpoint: "/graphql",
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  graphiql: process.env.GRAPHIQL_ENABLED === "true",
  maskedErrors: {
    maskError(error, message) {
      const exposed = expectedClientError(error);
      if (exposed) {
        return exposed;
      }
      console.error(error);
      return new GraphQLError(message, {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    },
  },
  logging: {
    debug: () => undefined,
    info: () => undefined,
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  },
});
