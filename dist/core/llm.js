"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHEAP_MODEL = exports.STRONG_MODEL = void 0;
exports.callLLM = callLLM;
exports.createEmbedding = createEmbedding;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MODEL_COSTS = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};
exports.STRONG_MODEL = process.env.STRONG_MODEL || 'gpt-4o';
exports.CHEAP_MODEL = process.env.CHEAP_MODEL || 'gpt-4o-mini';
function getOpenAIClient() {
    return new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
}
function getAnthropicClient() {
    return new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}
function isAnthropicModel(model) {
    return model.startsWith('claude-');
}
async function callWithRetry(fn, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
function calculateCost(model, tokensIn, tokensOut) {
    const costs = MODEL_COSTS[model] || { input: 0.005, output: 0.015 };
    return (tokensIn / 1000) * costs.input + (tokensOut / 1000) * costs.output;
}
async function callLLM(options) {
    const { model, messages, temperature = 0, seed, maxTokens = 4096 } = options;
    const startTime = Date.now();
    if (isAnthropicModel(model)) {
        return callWithRetry(async () => {
            const client = getAnthropicClient();
            const systemMsg = messages.find(m => m.role === 'system')?.content;
            const userMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role, content: m.content }));
            const response = await client.messages.create({
                model,
                max_tokens: maxTokens,
                temperature,
                system: systemMsg,
                messages: userMessages,
            });
            const content = response.content[0].type === 'text' ? response.content[0].text : '';
            const tokensIn = response.usage.input_tokens;
            const tokensOut = response.usage.output_tokens;
            const costUsd = calculateCost(model, tokensIn, tokensOut);
            const elapsed = Date.now() - startTime;
            console.log(`[llm] model=${model} tokens_in=${tokensIn} tokens_out=${tokensOut} cost=$${costUsd.toFixed(4)} latency=${elapsed}ms`);
            return { content, tokensIn, tokensOut, costUsd, model };
        });
    }
    return callWithRetry(async () => {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
            model,
            messages,
            temperature,
            seed,
            max_tokens: maxTokens,
        });
        const content = response.choices[0].message.content || '';
        const tokensIn = response.usage?.prompt_tokens || 0;
        const tokensOut = response.usage?.completion_tokens || 0;
        const costUsd = calculateCost(model, tokensIn, tokensOut);
        const elapsed = Date.now() - startTime;
        console.log(`[llm] model=${model} tokens_in=${tokensIn} tokens_out=${tokensOut} cost=$${costUsd.toFixed(4)} latency=${elapsed}ms`);
        return { content, tokensIn, tokensOut, costUsd, model };
    });
}
async function createEmbedding(text) {
    return callWithRetry(async () => {
        const client = getOpenAIClient();
        const response = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return response.data[0].embedding;
    });
}
//# sourceMappingURL=llm.js.map