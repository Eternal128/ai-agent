import { z } from 'zod';
import { ToolResult, SummarizeResult } from '../core/types';
export declare const SummarizeInputSchema: z.ZodObject<{
    text: z.ZodString;
    focus: z.ZodString;
}, z.core.$strip>;
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;
export declare function summarize(input: SummarizeInput): Promise<ToolResult<SummarizeResult>>;
//# sourceMappingURL=summarize.d.ts.map