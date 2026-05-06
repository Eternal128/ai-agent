"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearchInputSchema = void 0;
exports.vectorSearch = vectorSearch;
const zod_1 = require("zod");
const db_1 = require("../storage/db");
const llm_1 = require("../core/llm");
exports.VectorSearchInputSchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    runId: zod_1.z.string().uuid(),
    limit: zod_1.z.number().int().min(1).max(20).default(5),
});
async function vectorSearch(input) {
    const parsed = exports.VectorSearchInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
    }
    const { query, runId, limit } = parsed.data;
    try {
        const embedding = await (0, llm_1.createEmbedding)(query);
        const pool = (0, db_1.getPool)();
        const result = await pool.query(`SELECT id, run_id as "runId", url, title, publisher, retrieved_at as "retrievedAt", content, content_hash as "contentHash"
       FROM evidence
       WHERE run_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT $3`, [runId, JSON.stringify(embedding), limit]);
        return { ok: true, data: result.rows };
    }
    catch (error) {
        const err = error;
        return { ok: false, error: { code: 'VECTOR_SEARCH_FAILED', message: err.message } };
    }
}
//# sourceMappingURL=vectorSearch.js.map