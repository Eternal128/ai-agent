import { runPlanner } from '../../src/agents/planner';

jest.mock('../../src/core/llm', () => ({
  callLLM: jest.fn().mockResolvedValue({
    content: JSON.stringify({
      subQuestions: [
        'What are the main vector databases available?',
        'How does pgvector compare to Pinecone in performance?',
        'What are the cost differences between pgvector and Pinecone?',
      ],
      researchOrder: [0, 1, 2],
      estimatedSteps: 12,
    }),
    tokensIn: 100,
    tokensOut: 150,
    costUsd: 0.001,
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

describe('runPlanner', () => {
  it('should decompose question into sub-questions', async () => {
    const plan = await runPlanner('Compare pgvector vs Pinecone');
    expect(plan.subQuestions).toHaveLength(3);
    expect(plan.researchOrder).toEqual([0, 1, 2]);
    expect(plan.estimatedSteps).toBe(12);
  });

  it('should return valid plan structure', async () => {
    const plan = await runPlanner('What is the best database?');
    expect(Array.isArray(plan.subQuestions)).toBe(true);
    expect(Array.isArray(plan.researchOrder)).toBe(true);
    expect(typeof plan.estimatedSteps).toBe('number');
    expect(plan.subQuestions.length).toBeGreaterThanOrEqual(1);
  });
});
