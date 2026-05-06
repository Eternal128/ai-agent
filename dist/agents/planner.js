"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanSchema = void 0;
exports.runPlanner = runPlanner;
const zod_1 = require("zod");
const llm_1 = require("../core/llm");
const tracing_1 = require("../core/tracing");
exports.PlanSchema = zod_1.z.object({
    subQuestions: zod_1.z.array(zod_1.z.string()).min(1).max(10),
    researchOrder: zod_1.z.array(zod_1.z.number().int()),
    estimatedSteps: zod_1.z.number().int().min(1),
});
async function runPlanner(question, runId) {
    const span = (0, tracing_1.startSpan)('planner', { question: question.slice(0, 100), runId: runId || '' });
    const messages = [
        {
            role: 'system',
            content: `You are a research planning expert. Decompose the user's question into 3-7 focused sub-questions that together will comprehensively answer the main question. Prioritize sub-questions by research dependency (earlier sub-questions should inform later ones).

Return ONLY valid JSON with this structure:
{
  "subQuestions": ["sub-question 1", "sub-question 2", ...],
  "researchOrder": [0, 1, 2, ...],
  "estimatedSteps": 15
}

Rules:
- 3-7 sub-questions
- researchOrder is array of 0-based indices in recommended research order
- estimatedSteps is total estimated tool calls across all sub-questions
- Sub-questions must be specific, searchable, and non-overlapping`,
        },
        {
            role: 'user',
            content: `Research question: ${question}`,
        },
    ];
    try {
        const response = await (0, llm_1.callLLM)({
            model: llm_1.STRONG_MODEL,
            messages,
            temperature: 0,
            seed: 42,
        });
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('No JSON found in planner response');
        const rawPlan = JSON.parse(jsonMatch[0]);
        const plan = exports.PlanSchema.parse(rawPlan);
        if (plan.researchOrder.length !== plan.subQuestions.length) {
            plan.researchOrder = plan.subQuestions.map((_, i) => i);
        }
        (0, tracing_1.endSpan)(span, { subQuestions: plan.subQuestions.length, estimatedSteps: plan.estimatedSteps });
        console.log(`[planner] decomposed into ${plan.subQuestions.length} sub-questions`);
        plan.subQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
        return plan;
    }
    catch (error) {
        (0, tracing_1.endSpanWithError)(span, error);
        throw error;
    }
}
//# sourceMappingURL=planner.js.map