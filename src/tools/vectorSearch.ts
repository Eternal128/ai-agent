import { z } from 'zod';
import { getPool } from '../storage/db';
import { createEmbedding } from '../core/llm';
import { ToolResult, Evidence } from '../core/types';

export const VectorSearchInputSchema = z.object({
  query: z.string().min(1),
  runId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(5),
});

export type VectorSearchInput = z.infer<typeof VectorSearchInputSchema>;

export async function vectorSearch(input: VectorSearchInput): Promise<ToolResult<Evidence[]>> {
  const parsed = VectorSearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
  }

  const { query, runId, limit } = parsed.data;

  try {
    const embedding = await createEmbedding(query);
    const pool = getPool();
    
    const result = await pool.query<Evidence>(
      `SELECT id, run_id as "runId", url, title, publisher, retrieved_at as "retrievedAt", content, content_hash as "contentHash"
       FROM evidence
       WHERE run_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      [runId, JSON.stringify(embedding), limit]
    );

    return { ok: true, data: result.rows };
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: { code: 'VECTOR_SEARCH_FAILED', message: err.message } };
  }
}
