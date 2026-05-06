"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRun = createRun;
exports.updateRunStatus = updateRunStatus;
exports.insertEvidence = insertEvidence;
exports.getEvidenceByRunId = getEvidenceByRunId;
exports.insertStep = insertStep;
const db_1 = require("./db");
async function createRun(question) {
    const pool = (0, db_1.getPool)();
    const result = await pool.query(`INSERT INTO runs (question, status) VALUES ($1, 'planning') RETURNING *`, [question]);
    return result.rows[0];
}
async function updateRunStatus(runId, status, totalTokens, totalCostUsd) {
    const pool = (0, db_1.getPool)();
    await pool.query(`UPDATE runs SET status=$1, total_tokens=COALESCE($2, total_tokens), total_cost_usd=COALESCE($3, total_cost_usd), updated_at=now() WHERE id=$4`, [status, totalTokens, totalCostUsd, runId]);
}
async function insertEvidence(evidence) {
    const pool = (0, db_1.getPool)();
    try {
        const result = await pool.query(`INSERT INTO evidence (run_id, url, title, publisher, content, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (run_id, content_hash) DO NOTHING
       RETURNING *`, [evidence.runId, evidence.url, evidence.title, evidence.publisher, evidence.content, evidence.contentHash]);
        return result.rows[0] || null;
    }
    catch {
        return null;
    }
}
async function getEvidenceByRunId(runId) {
    const pool = (0, db_1.getPool)();
    const result = await pool.query(`SELECT * FROM evidence WHERE run_id = $1 ORDER BY retrieved_at`, [runId]);
    return result.rows;
}
async function insertStep(step) {
    const pool = (0, db_1.getPool)();
    const result = await pool.query(`INSERT INTO steps (run_id, parent_step_id, agent, tool, input, output, tokens_in, tokens_out, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`, [step.runId, step.parentStepId, step.agent, step.tool, JSON.stringify(step.input), JSON.stringify(step.output), step.tokensIn, step.tokensOut, step.latencyMs]);
    return result.rows[0];
}
//# sourceMappingURL=repo.js.map