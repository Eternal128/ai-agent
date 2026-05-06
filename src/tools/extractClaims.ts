import { z } from 'zod';
import { callLLM, CHEAP_MODEL } from '../core/llm';
import { ToolResult, ExtractClaimsResult } from '../core/types';

export const ExtractClaimsInputSchema = z.object({
  text: z.string().min(1),
});

export type ExtractClaimsInput = z.infer<typeof ExtractClaimsInputSchema>;

export async function extractClaims(input: ExtractClaimsInput): Promise<ToolResult<ExtractClaimsResult>> {
  const parsed = ExtractClaimsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
  }

  const { text } = parsed.data;
  const truncated = text.slice(0, 10000);

  try {
    const response = await callLLM({
      model: CHEAP_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Extract atomic factual claims from the text. Return ONLY valid JSON with this structure:
{
  "claims": [
    {
      "claim": "The factual claim as a complete sentence",
      "startOffset": 0,
      "endOffset": 50
    }
  ]
}
Each claim must be atomic (one fact), verifiable, and include approximate character offsets in the original text.`,
        },
        {
          role: 'user',
          content: truncated,
        },
      ],
    });

    let parsedResponse: ExtractClaimsResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsedResponse = JSON.parse(jsonMatch[0]) as ExtractClaimsResult;
    } catch {
      return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse claims JSON' } };
    }

    return { ok: true, data: parsedResponse };
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: { code: 'LLM_ERROR', message: err.message } };
  }
}
