import { getPool } from './db';
import { Evidence, Run, Step } from '../core/types';

export async function createRun(question: string): Promise<Run> {
  const pool = getPool();
  const result = await pool.query<Run>(
    `INSERT INTO runs (question, status) VALUES ($1, 'planning') RETURNING *`,
    [question]
  );
  return result.rows[0];
}

export async function updateRunStatus(
  runId: string,
  status: string,
  totalTokens?: number,
  totalCostUsd?: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE runs SET status=$1, total_tokens=COALESCE($2, total_tokens), total_cost_usd=COALESCE($3, total_cost_usd), updated_at=now() WHERE id=$4`,
    [status, totalTokens, totalCostUsd, runId]
  );
}

export async function insertEvidence(evidence: Omit<Evidence, 'id' | 'retrievedAt'>): Promise<Evidence | null> {
  const pool = getPool();
  try {
    const result = await pool.query<Evidence>(
      `INSERT INTO evidence (run_id, url, title, publisher, content, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (run_id, content_hash) DO NOTHING
       RETURNING *`,
      [evidence.runId, evidence.url, evidence.title, evidence.publisher, evidence.content, evidence.contentHash]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function getEvidenceByRunId(runId: string): Promise<Evidence[]> {
  const pool = getPool();
  const result = await pool.query<Evidence>(
    `SELECT * FROM evidence WHERE run_id = $1 ORDER BY retrieved_at`,
    [runId]
  );
  return result.rows;
}

export async function insertStep(step: Omit<Step, 'id' | 'createdAt'>): Promise<Step> {
  const pool = getPool();
  const result = await pool.query<Step>(
    `INSERT INTO steps (run_id, parent_step_id, agent, tool, input, output, tokens_in, tokens_out, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [step.runId, step.parentStepId, step.agent, step.tool, JSON.stringify(step.input), JSON.stringify(step.output), step.tokensIn, step.tokensOut, step.latencyMs]
  );
  return result.rows[0];
}
