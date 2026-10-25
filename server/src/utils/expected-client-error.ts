import { GraphQLError } from "graphql";

export function expectedClientError(error: unknown): GraphQLError | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const record = error as {
    message?: unknown;
    extensions?: { code?: unknown; field?: unknown };
    originalError?: unknown;
  };
  const code = record.extensions?.code;
  if (code === "BAD_USER_INPUT" || code === "NOT_FOUND") {
    return error as GraphQLError;
  }
  if (record.originalError) {
    return expectedClientError(record.originalError);
  }
  return undefined;
}
