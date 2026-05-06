import { Evidence, Run, Step } from '../core/types';
export declare function createRun(question: string): Promise<Run>;
export declare function updateRunStatus(runId: string, status: string, totalTokens?: number, totalCostUsd?: number): Promise<void>;
export declare function insertEvidence(evidence: Omit<Evidence, 'id' | 'retrievedAt'>): Promise<Evidence | null>;
export declare function getEvidenceByRunId(runId: string): Promise<Evidence[]>;
export declare function insertStep(step: Omit<Step, 'id' | 'createdAt'>): Promise<Step>;
//# sourceMappingURL=repo.d.ts.map