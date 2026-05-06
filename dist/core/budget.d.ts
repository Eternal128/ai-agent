export declare class BudgetExceededError extends Error {
    readonly cap: 'tokens' | 'cost' | 'time' | 'toolCalls';
    constructor(cap: 'tokens' | 'cost' | 'time' | 'toolCalls', message: string);
}
export interface BudgetConfig {
    maxTokens: number;
    maxUSD: number;
    maxSeconds: number;
    maxToolCalls: number;
}
export declare class BudgetTracker {
    private readonly config;
    private tokensUsed;
    private costUsd;
    private toolCallsUsed;
    private startTime;
    private _isPartial;
    constructor(config: BudgetConfig);
    addTokens(n: number): void;
    addCost(usd: number): void;
    addToolCall(): void;
    checkTime(): void;
    check(): void;
    private checkTokens;
    private checkCost;
    private checkToolCalls;
    isPartial(): boolean;
    getSummary(): {
        tokens: number;
        costUsd: number;
        toolCalls: number;
        elapsedSeconds: number;
    };
}
//# sourceMappingURL=budget.d.ts.map