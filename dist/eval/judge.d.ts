export interface JudgeScore {
    factuality: number;
    coverage: number;
    citationQuality: number;
    structure: number;
    conciseness: number;
    overall: number;
}
export interface JudgeResult {
    scores: JudgeScore;
    reasoning: string;
    passed: boolean;
}
export interface EvalEntry {
    id: string;
    category: string;
    question: string;
    must_cover: string[];
    forbidden_claims: string[];
    min_sources: number;
}
export declare function judgeReport(report: string, entry: EvalEntry): Promise<JudgeResult>;
//# sourceMappingURL=judge.d.ts.map