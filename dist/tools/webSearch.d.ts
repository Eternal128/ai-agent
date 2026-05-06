import { z } from 'zod';
import { ToolResult, SearchResult } from '../core/types';
export declare const WebSearchInputSchema: z.ZodObject<{
    query: z.ZodString;
    k: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
export declare function webSearch(input: WebSearchInput): Promise<ToolResult<SearchResult[]>>;
//# sourceMappingURL=webSearch.d.ts.map