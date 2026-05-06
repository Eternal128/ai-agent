import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL || 'postgres://agent:agent_secret@localhost:5432/research_agent',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle DB client', err);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function runMigration(sql: string): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}
