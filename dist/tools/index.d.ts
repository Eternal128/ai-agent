import { z } from 'zod';
import { webSearch } from './webSearch';
import { fetchUrl } from './fetchUrl';
import { summarize } from './summarize';
import { extractClaims } from './extractClaims';
import { vectorSearch } from './vectorSearch';
import { ToolResult } from '../core/types';
export type ToolName = 'web_search' | 'fetch_url' | 'summarize' | 'extract_claims' | 'vector_search';
export interface ToolDefinition<TInput, TOutput> {
    name: ToolName;
    description: string;
    inputSchema: z.ZodSchema<TInput>;
    execute: (input: TInput) => Promise<ToolResult<TOutput>>;
}
export declare const toolRegistry: Record<ToolName, ToolDefinition<any, any>>;
export declare function getToolNames(): ToolName[];
export declare function getToolDescriptions(): string;
export { webSearch, fetchUrl, summarize, extractClaims, vectorSearch };
//# sourceMappingURL=index.d.ts.map