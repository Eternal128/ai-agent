import { z } from 'zod';
import { ToolResult, FetchResult } from '../core/types';
export declare const FetchUrlInputSchema: z.ZodObject<{
    url: z.ZodString;
}, z.core.$strip>;
export type FetchUrlInput = z.infer<typeof FetchUrlInputSchema>;
export declare function fetchUrl(input: FetchUrlInput): Promise<ToolResult<FetchResult>>;
//# sourceMappingURL=fetchUrl.d.ts.map