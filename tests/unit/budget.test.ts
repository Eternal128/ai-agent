import { BudgetTracker, BudgetExceededError } from '../../src/core/budget';

describe('BudgetTracker', () => {
  it('should track tokens and throw when exceeded', () => {
    const budget = new BudgetTracker({ maxTokens: 100, maxUSD: 10, maxSeconds: 300, maxToolCalls: 50 });
    budget.addTokens(50);
    expect(() => budget.addTokens(60)).toThrow(BudgetExceededError);
  });

  it('should track cost and throw when exceeded', () => {
    const budget = new BudgetTracker({ maxTokens: 100000, maxUSD: 1.0, maxSeconds: 300, maxToolCalls: 50 });
    budget.addCost(0.80);
    expect(() => budget.addCost(0.30)).toThrow(BudgetExceededError);
  });

  it('should track tool calls and throw when exceeded', () => {
    const budget = new BudgetTracker({ maxTokens: 100000, maxUSD: 10, maxSeconds: 300, maxToolCalls: 3 });
    budget.addToolCall();
    budget.addToolCall();
    budget.addToolCall();
    expect(() => budget.addToolCall()).toThrow(BudgetExceededError);
  });

  it('should report isPartial after budget exceeded', () => {
    const budget = new BudgetTracker({ maxTokens: 10, maxUSD: 10, maxSeconds: 300, maxToolCalls: 50 });
    expect(budget.isPartial()).toBe(false);
    try {
      budget.addTokens(20);
    } catch { /* expected */ }
    expect(budget.isPartial()).toBe(true);
  });

  it('should return correct summary', () => {
    const budget = new BudgetTracker({ maxTokens: 100000, maxUSD: 10, maxSeconds: 300, maxToolCalls: 50 });
    budget.addTokens(500);
    budget.addCost(0.05);
    budget.addToolCall();
    budget.addToolCall();
    const summary = budget.getSummary();
    expect(summary.tokens).toBe(500);
    expect(summary.costUsd).toBe(0.05);
    expect(summary.toolCalls).toBe(2);
    expect(summary.elapsedSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should check time budget', () => {
    const budget = new BudgetTracker({ maxTokens: 100000, maxUSD: 10, maxSeconds: -1, maxToolCalls: 50 });
    expect(() => budget.checkTime()).toThrow(BudgetExceededError);
  });

  it('should identify which cap was hit', () => {
    const budget = new BudgetTracker({ maxTokens: 10, maxUSD: 10, maxSeconds: 300, maxToolCalls: 50 });
    try {
      budget.addTokens(20);
    } catch (e) {
      expect(e).toBeInstanceOf(BudgetExceededError);
      expect((e as BudgetExceededError).cap).toBe('tokens');
    }
  });
});
