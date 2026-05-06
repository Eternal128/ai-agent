"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeReport = judgeReport;
const llm_1 = require("../core/llm");
async function judgeReport(report, entry) {
    const judgeModel = process.env.JUDGE_MODEL || 'gpt-4o-mini';
    const mustCoverList = entry.must_cover.map(t => `- ${t}`).join('\n');
    const forbiddenList = entry.forbidden_claims.length > 0
        ? entry.forbidden_claims.map(c => `- ${c}`).join('\n')
        : 'None';
    const messages = [
        {
            role: 'system',
            content: `You are an expert research report evaluator. Score the report on a scale of 0-5 for each dimension.

Scoring rubric:
- factuality (0-5): Are facts accurate and not fabricated? Deduct for unsupported claims.
- coverage (0-5): Does it cover all required topics?
- citationQuality (0-5): Are citations present, relevant, and properly formatted?
- structure (0-5): Is the report well-organized with clear sections?
- conciseness (0-5): Is it appropriately concise without sacrificing depth?

Return ONLY valid JSON:
{
  "scores": {
    "factuality": 0-5,
    "coverage": 0-5,
    "citationQuality": 0-5,
    "structure": 0-5,
    "conciseness": 0-5
  },
  "reasoning": "Brief explanation of scores"
}`,
        },
        {
            role: 'user',
            content: `Question: ${entry.question}

Required topics to cover:
${mustCoverList}

Forbidden claims (if present, deduct from factuality):
${forbiddenList}

Minimum sources required: ${entry.min_sources}

Report to evaluate:
${report.slice(0, 6000)}`,
        },
    ];
    const response = await (0, llm_1.callLLM)({
        model: judgeModel,
        messages,
        temperature: 0,
    });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error('No JSON in judge response');
    const parsed = JSON.parse(jsonMatch[0]);
    const scores = parsed.scores;
    const overall = (scores.factuality + scores.coverage + scores.citationQuality + scores.structure + scores.conciseness) / 5;
    return {
        scores: { ...scores, overall },
        reasoning: parsed.reasoning,
        passed: overall >= 3.0,
    };
}
//# sourceMappingURL=judge.js.map