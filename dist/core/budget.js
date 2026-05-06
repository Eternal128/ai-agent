"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetTracker = exports.BudgetExceededError = void 0;
class BudgetExceededError extends Error {
    cap;
    constructor(cap, message) {
        super(message);
        this.cap = cap;
        this.name = 'BudgetExceededError';
    }
}
exports.BudgetExceededError = BudgetExceededError;
class BudgetTracker {
    config;
    tokensUsed = 0;
    costUsd = 0;
    toolCallsUsed = 0;
    startTime;
    _isPartial = false;
    constructor(config) {
        this.config = config;
        this.startTime = Date.now();
    }
    addTokens(n) {
        this.tokensUsed += n;
        try {
            this.checkTokens();
        }
        catch (e) {
            this._isPartial = true;
            throw e;
        }
    }
    addCost(usd) {
        this.costUsd += usd;
        try {
            this.checkCost();
        }
        catch (e) {
            this._isPartial = true;
            throw e;
        }
    }
    addToolCall() {
        this.toolCallsUsed += 1;
        try {
            this.checkToolCalls();
        }
        catch (e) {
            this._isPartial = true;
            throw e;
        }
    }
    checkTime() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (elapsed > this.config.maxSeconds) {
            this._isPartial = true;
            throw new BudgetExceededError('time', `Time budget exceeded: ${elapsed.toFixed(1)}s > ${this.config.maxSeconds}s`);
        }
    }
    check() {
        this.checkTokens();
        this.checkCost();
        this.checkToolCalls();
        this.checkTime();
    }
    checkTokens() {
        if (this.tokensUsed > this.config.maxTokens) {
            throw new BudgetExceededError('tokens', `Token budget exceeded: ${this.tokensUsed} > ${this.config.maxTokens}`);
        }
    }
    checkCost() {
        if (this.costUsd > this.config.maxUSD) {
            throw new BudgetExceededError('cost', `Cost budget exceeded: $${this.costUsd.toFixed(4)} > $${this.config.maxUSD}`);
        }
    }
    checkToolCalls() {
        if (this.toolCallsUsed > this.config.maxToolCalls) {
            throw new BudgetExceededError('toolCalls', `Tool call budget exceeded: ${this.toolCallsUsed} > ${this.config.maxToolCalls}`);
        }
    }
    isPartial() {
        return this._isPartial;
    }
    getSummary() {
        return {
            tokens: this.tokensUsed,
            costUsd: this.costUsd,
            toolCalls: this.toolCallsUsed,
            elapsedSeconds: (Date.now() - this.startTime) / 1000,
        };
    }
}
exports.BudgetTracker = BudgetTracker;
//# sourceMappingURL=budget.js.map