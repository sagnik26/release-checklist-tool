import { describe, expect, it } from "vitest";
import { appModule } from "../../src/app.module.js";
import { STEP_DEFINITIONS } from "../../src/releases/steps.constants.js";

const getPool = () => appModule.databaseService.getPool();

describe("step definition drift", () => {
  it("matches the step_key enum labels", async () => {
    const result = await getPool().query(
      `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'step_key'
       ORDER BY e.enumsortorder`,
    );
    expect(result.rows.map((row) => row.enumlabel)).toEqual(
      STEP_DEFINITIONS.map((step) => step.key),
    );
  });
});
