import { z } from 'zod';
import { callLLM, STRONG_MODEL } from '../core/llm';
import { Plan, LLMMessage } from '../core/types';
import { startSpan, endSpan, endSpanWithError } from '../core/tracing';

export const PlanSchema = z.object({
  subQuestions: z.array(z.string()).min(1).max(10),
  researchOrder: z.array(z.number().int()),
  estimatedSteps: z.number().int().min(1),
});

export async function runPlanner(question: string, runId?: string): Promise<Plan> {
  const span = startSpan('planner', { question: question.slice(0, 100), runId: runId || '' });

  const messages: LLMMessage[] = [
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
    const response = await callLLM({
      model: STRONG_MODEL,
      messages,
      temperature: 0,
      seed: 42,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in planner response');

    const rawPlan = JSON.parse(jsonMatch[0]) as unknown;
    const plan = PlanSchema.parse(rawPlan);

    if (plan.researchOrder.length !== plan.subQuestions.length) {
      plan.researchOrder = plan.subQuestions.map((_, i) => i);
    }

    endSpan(span, { subQuestions: plan.subQuestions.length, estimatedSteps: plan.estimatedSteps });
    console.log(`[planner] decomposed into ${plan.subQuestions.length} sub-questions`);
    plan.subQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

    return plan;
  } catch (error) {
    endSpanWithError(span, error as Error);
    throw error;
  }
}
