import { Plan, Evidence } from './types';
export interface RunConfig {
    question: string;
    budgetUsd?: number;
    maxSteps?: number;
    modelStrong?: string;
    modelCheap?: string;
    seed?: number;
    noCritic?: boolean;
    outDir?: string;
}
export interface RunResult {
    runId: string;
    report: string;
    plan: Plan;
    evidence: Evidence[];
    isPartial: boolean;
    summary: {
        toolCalls: number;
        tokens: number;
        costUsd: number;
        elapsedSeconds: number;
    };
}
export declare function runResearchLoop(config: RunConfig): Promise<RunResult>;
//# sourceMappingURL=loop.d.ts.map