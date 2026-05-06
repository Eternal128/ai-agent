"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractClaimsInputSchema = void 0;
exports.extractClaims = extractClaims;
const zod_1 = require("zod");
const llm_1 = require("../core/llm");
exports.ExtractClaimsInputSchema = zod_1.z.object({
    text: zod_1.z.string().min(1),
});
async function extractClaims(input) {
    const parsed = exports.ExtractClaimsInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
    }
    const { text } = parsed.data;
    const truncated = text.slice(0, 10000);
    try {
        const response = await (0, llm_1.callLLM)({
            model: llm_1.CHEAP_MODEL,
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
        let parsedResponse;
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON found');
            parsedResponse = JSON.parse(jsonMatch[0]);
        }
        catch {
            return { ok: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse claims JSON' } };
        }
        return { ok: true, data: parsedResponse };
    }
    catch (error) {
        const err = error;
        return { ok: false, error: { code: 'LLM_ERROR', message: err.message } };
    }
}
//# sourceMappingURL=extractClaims.js.map