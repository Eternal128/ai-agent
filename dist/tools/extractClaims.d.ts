import { z } from 'zod';
import { ToolResult, ExtractClaimsResult } from '../core/types';
export declare const ExtractClaimsInputSchema: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
export type ExtractClaimsInput = z.infer<typeof ExtractClaimsInputSchema>;
export declare function extractClaims(input: ExtractClaimsInput): Promise<ToolResult<ExtractClaimsResult>>;
//# sourceMappingURL=extractClaims.d.ts.map