import { z } from 'zod';
import { callLLM, STRONG_MODEL } from '../core/llm';
import { Evidence, CriticResult, LLMMessage } from '../core/types';
import { startSpan, endSpan, endSpanWithError } from '../core/tracing';

export const CriticResultSchema = z.object({
  verdict: z.enum(['APPROVE', 'REVISE']),
  scores: z.object({
    coverage: z.number().min(0).max(1),
    citationDensity: z.number().min(0).max(1),
    sourceDiversity: z.number().min(0).max(1),
    internalConsistency: z.number().min(0).max(1),
  }),
  revisionRequest: z.string().optional(),
});

export async function runCritic(
  draftReport: string,
  evidence: Evidence[],
  question: string
): Promise<CriticResult> {
  const span = startSpan('critic', { question: question.slice(0, 100) });

  const evidenceSummary = evidence
    .slice(0, 20)
    .map((e, i) => `[${i + 1}] ${e.title || e.url || 'Unknown'}: ${e.content.slice(0, 200)}`)
    .join('\n');

  const messages: LLMMessage[] = [
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
    const response = await callLLM({
      model: STRONG_MODEL,
      messages,
      temperature: 0,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in critic response');

    const rawResult = JSON.parse(jsonMatch[0]) as unknown;
    const result = CriticResultSchema.parse(rawResult);

    const scores = result.scores;
    const meanScore = (scores.coverage + scores.citationDensity + scores.sourceDiversity + scores.internalConsistency) / 4;
    console.log(`[critic] coverage=${scores.coverage.toFixed(2)} citations=${scores.citationDensity.toFixed(2)} diversity=${scores.sourceDiversity.toFixed(2)} consistency=${scores.internalConsistency.toFixed(2)} mean=${meanScore.toFixed(2)} -> ${result.verdict}`);

    endSpan(span, { verdict: result.verdict, meanScore });
    return result;
  } catch (error) {
    endSpanWithError(span, error as Error);
    throw error;
  }
}
