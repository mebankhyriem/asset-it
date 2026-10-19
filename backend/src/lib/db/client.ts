import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true,
    });
  }
  return pool;
}

type Executor = (sql: string, params: unknown[]) => Promise<[RowDataPacket[] | ResultSetHeader, unknown]>;

function makeExecutor(exec: Executor) {
  return {
    async get<T = any>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const [rows] = await exec(sql, params);
      return (rows as RowDataPacket[])[0] as T | undefined;
    },
    async all<T = any>(sql: string, ...params: unknown[]): Promise<T[]> {
      const [rows] = await exec(sql, params);
      return rows as T[];
    },
    async run(sql: string, ...params: unknown[]): Promise<ResultSetHeader> {
      const [result] = await exec(sql, params);
      return result as ResultSetHeader;
    },
  };
}

export type DbHandle = ReturnType<typeof makeExecutor> & {
  prepare(sql: string): {
    get: (...params: unknown[]) => Promise<any>;
    all: (...params: unknown[]) => Promise<any[]>;
    run: (...params: unknown[]) => Promise<ResultSetHeader>;
  };
};

function wrapPrepare(base: ReturnType<typeof makeExecutor>): DbHandle {
  return {
    ...base,
    prepare(sql: string) {
      return {
        get: (...params: unknown[]) => base.get(sql, ...params),
        all: (...params: unknown[]) => base.all(sql, ...params),
        run: (...params: unknown[]) => base.run(sql, ...params),
      };
    },
  };
}

export function getDb(): DbHandle {
  return wrapPrepare(makeExecutor((sql, params) => getPool().query(sql, params)));
}
