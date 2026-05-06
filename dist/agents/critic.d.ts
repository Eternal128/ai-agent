import { z } from 'zod';
import { Evidence, CriticResult } from '../core/types';
export declare const CriticResultSchema: z.ZodObject<{
    verdict: z.ZodEnum<{
        APPROVE: "APPROVE";
        REVISE: "REVISE";
    }>;
    scores: z.ZodObject<{
        coverage: z.ZodNumber;
        citationDensity: z.ZodNumber;
        sourceDiversity: z.ZodNumber;
        internalConsistency: z.ZodNumber;
    }, z.core.$strip>;
    revisionRequest: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function runCritic(draftReport: string, evidence: Evidence[], question: string): Promise<CriticResult>;
//# sourceMappingURL=critic.d.ts.map