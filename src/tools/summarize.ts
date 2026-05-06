import { z } from 'zod';
import { callLLM, CHEAP_MODEL } from '../core/llm';
import { ToolResult, SummarizeResult } from '../core/types';

export const SummarizeInputSchema = z.object({
  text: z.string().min(1),
  focus: z.string().min(1),
});

export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

export async function summarize(input: SummarizeInput): Promise<ToolResult<SummarizeResult>> {
  const parsed = SummarizeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
  }

  const { text, focus } = parsed.data;
  const truncated = text.slice(0, 15000);

  try {
    const response = await callLLM({
      model: CHEAP_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a precise summarizer. Compress the provided text while preserving all factual claims, citations, statistics, and named entities relevant to the focus area. Output ONLY the summary, no preamble.`,
        },
        {
          role: 'user',
          content: `Focus: ${focus}\n\nText to summarize:\n${truncated}`,
        },
      ],
    });

    return {
      ok: true,
      data: {
        summary: response.content,
        tokensUsed: response.tokensIn + response.tokensOut,
      },
    };
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: { code: 'LLM_ERROR', message: err.message } };
  }
}
