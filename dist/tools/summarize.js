"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeInputSchema = void 0;
exports.summarize = summarize;
const zod_1 = require("zod");
const llm_1 = require("../core/llm");
exports.SummarizeInputSchema = zod_1.z.object({
    text: zod_1.z.string().min(1),
    focus: zod_1.z.string().min(1),
});
async function summarize(input) {
    const parsed = exports.SummarizeInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
    }
    const { text, focus } = parsed.data;
    const truncated = text.slice(0, 15000);
    try {
        const response = await (0, llm_1.callLLM)({
            model: llm_1.CHEAP_MODEL,
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
    }
    catch (error) {
        const err = error;
        return { ok: false, error: { code: 'LLM_ERROR', message: err.message } };
    }
}
//# sourceMappingURL=summarize.js.map