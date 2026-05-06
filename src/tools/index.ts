import { z } from 'zod';
import { webSearch, WebSearchInputSchema, WebSearchInput } from './webSearch';
import { fetchUrl, FetchUrlInputSchema, FetchUrlInput } from './fetchUrl';
import { summarize, SummarizeInputSchema, SummarizeInput } from './summarize';
import { extractClaims, ExtractClaimsInputSchema, ExtractClaimsInput } from './extractClaims';
import { vectorSearch, VectorSearchInputSchema, VectorSearchInput } from './vectorSearch';
import { ToolResult } from '../core/types';

export type ToolName = 'web_search' | 'fetch_url' | 'summarize' | 'extract_claims' | 'vector_search';

export interface ToolDefinition<TInput, TOutput> {
  name: ToolName;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  execute: (input: TInput) => Promise<ToolResult<TOutput>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolRegistry: Record<ToolName, ToolDefinition<any, any>> = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for information. Input: {query, k?}. Output: array of {url, title, snippet, publishedAt?}',
    inputSchema: WebSearchInputSchema,
    execute: (input: WebSearchInput) => webSearch(input),
  },
  fetch_url: {
    name: 'fetch_url',
    description: 'Fetch and extract clean text from a URL. Input: {url}. Output: {url, title, content, publisher?}',
    inputSchema: FetchUrlInputSchema,
    execute: (input: FetchUrlInput) => fetchUrl(input),
  },
  summarize: {
    name: 'summarize',
    description: 'Summarize text with a focus area. Input: {text, focus}. Output: {summary, tokensUsed}',
    inputSchema: SummarizeInputSchema,
    execute: (input: SummarizeInput) => summarize(input),
  },
  extract_claims: {
    name: 'extract_claims',
    description: 'Extract atomic factual claims from text. Input: {text}. Output: {claims: [{claim, startOffset, endOffset}]}',
    inputSchema: ExtractClaimsInputSchema,
    execute: (input: ExtractClaimsInput) => extractClaims(input),
  },
  vector_search: {
    name: 'vector_search',
    description: 'Search existing evidence using semantic similarity. Input: {query, runId, limit?}. Output: Evidence[]',
    inputSchema: VectorSearchInputSchema,
    execute: (input: VectorSearchInput) => vectorSearch(input),
  },
};

export function getToolNames(): ToolName[] {
  return Object.keys(toolRegistry) as ToolName[];
}

export function getToolDescriptions(): string {
  return Object.values(toolRegistry)
    .map(t => `- ${t.name}: ${t.description}`)
    .join('\n');
}

export { webSearch, fetchUrl, summarize, extractClaims, vectorSearch };
