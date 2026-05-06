"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticResultSchema = void 0;
exports.runCritic = runCritic;
const zod_1 = require("zod");
const llm_1 = require("../core/llm");
const tracing_1 = require("../core/tracing");
exports.CriticResultSchema = zod_1.z.object({
    verdict: zod_1.z.enum(['APPROVE', 'REVISE']),
    scores: zod_1.z.object({
        coverage: zod_1.z.number().min(0).max(1),
        citationDensity: zod_1.z.number().min(0).max(1),
        sourceDiversity: zod_1.z.number().min(0).max(1),
        internalConsistency: zod_1.z.number().min(0).max(1),
    }),
    revisionRequest: zod_1.z.string().optional(),
});
async function runCritic(draftReport, evidence, question) {
    const span = (0, tracing_1.startSpan)('critic', { question: question.slice(0, 100) });
    const evidenceSummary = evidence
        .slice(0, 20)
        .map((e, i) => `[${i + 1}] ${e.title || e.url || 'Unknown'}: ${e.content.slice(0, 200)}`)
        .join('\n');
    const messages = [
        {
            role: 'system',
            content: `You are a rigorous research report critic. Evaluate the draft report against the evidence and original question.

Score on these dimensions (0.0 to 1.0):
- coverage: Does the report address all aspects of the question using available evidence?
- citationDensity: Are claims backed by citations? (ratio of cited claims to total claims)
- sourceDiversity: Are multiple diverse sources used?
- internalConsistency: Are there no contradictions within the report?

Return ONLY valid JSON:
{
  "verdict": "APPROVE" or "REVISE",
  "scores": {
    "coverage": 0.0-1.0,
    "citationDensity": 0.0-1.0,
    "sourceDiversity": 0.0-1.0,
    "internalConsistency": 0.0-1.0
  },
  "revisionRequest": "Specific instructions for revision (only if REVISE)"
}

APPROVE if mean score >= 0.7 and no score < 0.5. Otherwise REVISE.`,
        },
        {
            role: 'user',
            content: `Original question: ${question}\n\nAvailable evidence:\n${evidenceSummary}\n\nDraft report:\n${draftReport.slice(0, 8000)}`,
        },
    ];
    try {
        const response = await (0, llm_1.callLLM)({
            model: llm_1.STRONG_MODEL,
            messages,
            temperature: 0,
        });
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('No JSON in critic response');
        const rawResult = JSON.parse(jsonMatch[0]);
        const result = exports.CriticResultSchema.parse(rawResult);
        const scores = result.scores;
        const meanScore = (scores.coverage + scores.citationDensity + scores.sourceDiversity + scores.internalConsistency) / 4;
        console.log(`[critic] coverage=${scores.coverage.toFixed(2)} citations=${scores.citationDensity.toFixed(2)} diversity=${scores.sourceDiversity.toFixed(2)} consistency=${scores.internalConsistency.toFixed(2)} mean=${meanScore.toFixed(2)} -> ${result.verdict}`);
        (0, tracing_1.endSpan)(span, { verdict: result.verdict, meanScore });
        return result;
    }
    catch (error) {
        (0, tracing_1.endSpanWithError)(span, error);
        throw error;
    }
}
//# sourceMappingURL=critic.js.map