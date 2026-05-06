import { z } from 'zod';
import { ToolResult, Evidence } from '../core/types';
export declare const VectorSearchInputSchema: z.ZodObject<{
    query: z.ZodString;
    runId: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type VectorSearchInput = z.infer<typeof VectorSearchInputSchema>;
export declare function vectorSearch(input: VectorSearchInput): Promise<ToolResult<Evidence[]>>;
//# sourceMappingURL=vectorSearch.d.ts.map