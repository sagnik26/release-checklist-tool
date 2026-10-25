import { describe, expect, it } from "vitest";
import { GraphQLError } from "graphql";
import { ValidationPipe } from "../../src/common/validators/validation.pipe.js";

const validationPipe = new ValidationPipe();

function fieldOf(error: unknown): string | undefined {
  expect(error).toBeInstanceOf(GraphQLError);
  const graphQLError = error as GraphQLError;
  expect(graphQLError.extensions.code).toBe("BAD_USER_INPUT");
  return graphQLError.extensions.field as string;
}

describe("validationPipe.name", () => {
  it("trims a valid name", () => {
    expect(validationPipe.name("  Version 1.0.1  ")).toBe("Version 1.0.1");
  });

  it("rejects a blank name", () => {
    expect(fieldOf(catchError(() => validationPipe.name("   ")))).toBe("name");
  });

  it("rejects a name of 101 characters", () => {
    expect(fieldOf(catchError(() => validationPipe.name("a".repeat(101))))).toBe("name");
  });

  it("accepts a name of 100 characters", () => {
    expect(validationPipe.name("a".repeat(100))).toHaveLength(100);
  });
});

describe("validationPipe.dueDate", () => {
  it("accepts a real past date", () => {
    expect(validationPipe.dueDate("2020-01-15")).toBe("2020-01-15");
  });

  it("rejects a calendar-invalid date", () => {
    expect(fieldOf(catchError(() => validationPipe.dueDate("2026-02-30")))).toBe("dueDate");
  });

  it("rejects a non ISO date", () => {
    expect(fieldOf(catchError(() => validationPipe.dueDate("September 20, 2022")))).toBe("dueDate");
  });
});

describe("validationPipe.notes", () => {
  it("stores blank notes as null", () => {
    expect(validationPipe.notes("")).toBeNull();
    expect(validationPipe.notes("   ")).toBeNull();
    expect(validationPipe.notes(null)).toBeNull();
    expect(validationPipe.notes(undefined)).toBeNull();
  });

  it("rejects notes of 2001 characters", () => {
    expect(fieldOf(catchError(() => validationPipe.notes("a".repeat(2001))))).toBe("notes");
  });

  it("keeps notes of 2000 characters", () => {
    expect(validationPipe.notes("a".repeat(2000))).toHaveLength(2000);
  });
});

describe("validationPipe.uuid", () => {
  it("accepts a uuid", () => {
    const id = "4f6b1c2e-8a0d-4c3b-9e1f-2a7b6c5d4e3f";
    expect(validationPipe.uuid(id, "id")).toBe(id);
  });

  it("rejects an invalid id", () => {
    expect(fieldOf(catchError(() => validationPipe.uuid("nope", "releaseId")))).toBe("releaseId");
  });
});

describe("validationPipe.clientId", () => {
  it("accepts a non-empty id up to 64 characters", () => {
    expect(validationPipe.clientId("a")).toBe("a");
    expect(validationPipe.clientId("b".repeat(64))).toHaveLength(64);
  });

  it("rejects an empty or oversized id", () => {
    expect(fieldOf(catchError(() => validationPipe.clientId("")))).toBe("clientId");
    expect(fieldOf(catchError(() => validationPipe.clientId("c".repeat(65))))).toBe("clientId");
  });
});

function catchError(fn: () => unknown): unknown {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error;
  }
}
