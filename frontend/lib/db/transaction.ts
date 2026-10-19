import "server-only";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "./client";

export type TxHandle = {
  get<T = any>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T = any>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<ResultSetHeader>;
  prepare(sql: string): {
    get: (...params: unknown[]) => Promise<any>;
    all: (...params: unknown[]) => Promise<any[]>;
    run: (...params: unknown[]) => Promise<ResultSetHeader>;
  };
  // Connection-scoped, mirrors better-sqlite3's db.pragma("foreign_keys = OFF/ON") toggle
  // used by deleteAsset's manual cascade delete — must run on the same connection as the
  // deletes themselves, which is why this only exists on the transaction-bound handle.
  setForeignKeyChecks(on: boolean): Promise<void>;
};

function bindToConnection(conn: PoolConnection): TxHandle {
  const exec = (sql: string, params: unknown[]) => conn.query(sql, params);
  const get = async (sql: string, ...params: unknown[]): Promise<any> => {
    const [rows] = await exec(sql, params);
    return (rows as RowDataPacket[])[0];
  };
  const all = async (sql: string, ...params: unknown[]): Promise<any[]> => {
    const [rows] = await exec(sql, params);
    return rows as any[];
  };
  const run = async (sql: string, ...params: unknown[]): Promise<ResultSetHeader> => {
    const [result] = await exec(sql, params);
    return result as ResultSetHeader;
  };
  return {
    get,
    all,
    run,
    prepare: (sql: string) => ({
      get: (...params: unknown[]) => get(sql, ...params),
      all: (...params: unknown[]) => all(sql, ...params),
      run: (...params: unknown[]) => run(sql, ...params),
    }),
    setForeignKeyChecks: async (on: boolean) => {
      await conn.query(`SET FOREIGN_KEY_CHECKS = ${on ? 1 : 0}`);
    },
  };
}

export async function withTransaction<T>(fn: (db: TxHandle) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(bindToConnection(conn));
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
