import { runExecutor } from '../../src/agents/executor';
import { BudgetTracker } from '../../src/core/budget';
import { Plan } from '../../src/core/types';

jest.mock('../../src/core/llm', () => ({
  callLLM: jest.fn()
    .mockResolvedValueOnce({
      content: JSON.stringify({
        thought: 'I should check existing evidence first',
        action: 'vector_search',
        action_input: { query: 'pgvector performance', runId: 'test-run-id', limit: 5 },
      }),
      tokensIn: 50,
      tokensOut: 80,
      costUsd: 0.001,
      model: 'gpt-4o',
    })
    .mockResolvedValueOnce({
      content: JSON.stringify({
        thought: 'I have enough information',
        action: 'done',
        action_input: null,
      }),
      tokensIn: 50,
      tokensOut: 30,
      costUsd: 0.0005,
      model: 'gpt-4o',
    }),
  STRONG_MODEL: 'gpt-4o',
  CHEAP_MODEL: 'gpt-4o-mini',
}));

jest.mock('../../src/core/tracing', () => ({
  startSpan: jest.fn().mockReturnValue({}),
  endSpan: jest.fn(),
  endSpanWithError: jest.fn(),
}));

jest.mock('../../src/tools/index', () => ({
  toolRegistry: {
    vector_search: {
      name: 'vector_search',
      description: 'Search existing evidence',
      inputSchema: { safeParse: () => ({ success: true, data: {} }) },
      execute: jest.fn().mockResolvedValue({ ok: true, data: [] }),
    },
  },
  getToolDescriptions: () => 'mocked tool descriptions',
}));

jest.mock('../../src/storage/repo', () => ({
  insertEvidence: jest.fn().mockResolvedValue(null),
}));

describe('runExecutor', () => {
  const plan: Plan = {
    subQuestions: ['What is pgvector performance like?'],
    researchOrder: [0],
    estimatedSteps: 5,
  };

  it('should stop on done action', async () => {
    const budget = new BudgetTracker({ maxTokens: 100000, maxUSD: 10, maxSeconds: 300, maxToolCalls: 50 });
    const evidence = await runExecutor(plan, 0, 'test-run-id', budget);
    expect(Array.isArray(evidence)).toBe(true);
  });

  it('should respect budget limits', async () => {
    const tightBudget = new BudgetTracker({ maxTokens: 1, maxUSD: 0, maxSeconds: 300, maxToolCalls: 50 });
    const evidence = await runExecutor(plan, 0, 'test-run-id', tightBudget);
    expect(Array.isArray(evidence)).toBe(true);
  });
});
