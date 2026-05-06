import { z } from 'zod';
import { Plan } from '../core/types';
export declare const PlanSchema: z.ZodObject<{
    subQuestions: z.ZodArray<z.ZodString>;
    researchOrder: z.ZodArray<z.ZodNumber>;
    estimatedSteps: z.ZodNumber;
}, z.core.$strip>;
export declare function runPlanner(question: string, runId?: string): Promise<Plan>;
//# sourceMappingURL=planner.d.ts.map