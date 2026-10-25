import type pg from "pg";
import type { DatabaseService } from "../../database/database.service.js";
import type { ReleaseRecord, StepRecord } from "../entities/release.entity.js";

type Queryable = pg.Pool | pg.PoolClient;

export class ReleasesRepository {
  private stepsQueryCount = 0;

  constructor(private readonly databaseService: DatabaseService) {}

  readStepsQueryCount(): number {
    return this.stepsQueryCount;
  }

  resetStepsQueryCount(): void {
    this.stepsQueryCount = 0;
  }

  async nameTaken(client: Queryable, name: string): Promise<boolean> {
    const result = await client.query(
      `SELECT 1
       FROM release
       WHERE lower(name) = lower($1)
       LIMIT 1`,
      [name],
    );
    return result.rows.length > 0;
  }

  async create(
    client: Queryable,
    input: { name: string; dueDate: string; notes: string | null },
  ): Promise<ReleaseRecord> {
    const result = await client.query(
      `INSERT INTO release (name, due_date, notes)
       VALUES ($1, $2, $3)
       RETURNING id, name, due_date, notes, created_at`,
      [input.name, input.dueDate, input.notes],
    );
    return this.toReleaseRecord(result.rows[0]);
  }

  async createSteps(client: Queryable, releaseId: string): Promise<void> {
    await client.query(
      `INSERT INTO release_step (release_id, step_key)
       SELECT $1, unnest(enum_range(NULL::step_key))`,
      [releaseId],
    );
  }

  async findById(client: Queryable, id: string): Promise<ReleaseRecord | null> {
    const result = await client.query(
      `SELECT id, name, due_date, notes, created_at
       FROM release
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.toReleaseRecord(row) : null;
  }

  async findAll(): Promise<ReleaseRecord[]> {
    const result = await this.databaseService.getPool().query(
      `SELECT id, name, due_date, notes, created_at
       FROM release
       ORDER BY due_date ASC, name ASC`,
    );
    return result.rows.map((row) => this.toReleaseRecord(row));
  }

  async findStepsByReleaseIds(
    releaseIds: string[],
    options: { client?: Queryable; track?: boolean } = {},
  ): Promise<StepRecord[]> {
    if (releaseIds.length === 0) {
      return [];
    }
    if (options.track) {
      this.stepsQueryCount += 1;
    }
    const client = options.client ?? this.databaseService.getPool();
    const result = await client.query(
      `SELECT release_id, step_key, completed
       FROM release_step
       WHERE release_id = ANY($1::uuid[])`,
      [releaseIds],
    );
    return result.rows.map((row) => ({
      releaseId: row.release_id,
      stepKey: row.step_key,
      completed: row.completed,
    }));
  }

  async setStepCompleted(
    client: Queryable,
    releaseId: string,
    stepKey: string,
    completed: boolean,
  ): Promise<number> {
    const result = await client.query(
      `UPDATE release_step
       SET completed = $3
       WHERE release_id = $1 AND step_key = $2`,
      [releaseId, stepKey, completed],
    );
    return result.rowCount ?? 0;
  }

  async updateNotes(id: string, notes: string | null): Promise<ReleaseRecord | null> {
    const result = await this.databaseService.getPool().query(
      `UPDATE release
       SET notes = $2
       WHERE id = $1
       RETURNING id, name, due_date, notes, created_at`,
      [id, notes],
    );
    const row = result.rows[0];
    return row ? this.toReleaseRecord(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.databaseService.getPool().query(
      `DELETE FROM release
       WHERE id = $1
       RETURNING id`,
      [id],
    );
    return (result.rowCount ?? 0) === 1;
  }

  private toReleaseRecord(row: {
    id: string;
    name: string;
    due_date: string;
    notes: string | null;
    created_at: Date;
  }): ReleaseRecord {
    return {
      id: row.id,
      name: row.name,
      dueDate: row.due_date,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
