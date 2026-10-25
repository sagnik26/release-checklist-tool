import { GraphQLError } from "graphql";

export function badUserInput(field: string, message = "Invalid input"): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", field },
  });
}

export function notFound(message = "Not found"): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
