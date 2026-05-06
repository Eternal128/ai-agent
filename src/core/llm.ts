import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LLMMessage, LLMResponse } from './types';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

export const STRONG_MODEL = process.env.STRONG_MODEL || 'gpt-4o';
export const CHEAP_MODEL = process.env.CHEAP_MODEL || 'gpt-4o-mini';

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.005, output: 0.015 };
  return (tokensIn / 1000) * costs.input + (tokensOut / 1000) * costs.output;
}

export interface CallLLMOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  seed?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function callLLM(options: CallLLMOptions): Promise<LLMResponse> {
  const { model, messages, temperature = 0, seed, maxTokens = 4096 } = options;
  const startTime = Date.now();

  if (isAnthropicModel(model)) {
    return callWithRetry(async () => {
      const client = getAnthropicClient();
      const systemMsg = messages.find(m => m.role === 'system')?.content;
      const userMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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

export async function createEmbedding(text: string): Promise<number[]> {
  return callWithRetry(async () => {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  });
}
