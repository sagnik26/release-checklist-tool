import pg from "pg";

const { Pool, types } = pg;

const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

export class DatabaseService {
  private pool: pg.Pool | undefined;

  connectionString(): string {
    const url = process.env.VITEST
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL;
    if (!url) {
      const name = process.env.VITEST ? "TEST_DATABASE_URL" : "DATABASE_URL";
      throw new Error(`${name} is not set`);
    }
    return url;
  }

  getPool(): pg.Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString(),
        max: 10,
      });
    }
    return this.pool;
  }

  async withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed", rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }
    const current = this.pool;
    this.pool = undefined;
    await current.end();
  }
}
