import { runResearchLoop } from '../../src/core/loop';

jest.mock('../../src/agents/planner', () => ({
  runPlanner: jest.fn().mockResolvedValue({
    subQuestions: ['What are the main differences between pgvector and Pinecone?'],
    researchOrder: [0],
    estimatedSteps: 3,
  }),
}));

jest.mock('../../src/agents/executor', () => ({
  runExecutor: jest.fn().mockResolvedValue([
    {
      id: 'evidence-1',
      runId: 'test-run-id',
      url: 'https://example.com/article',
      title: 'Vector Database Comparison',
      content: 'pgvector is an open-source PostgreSQL extension. Pinecone is a managed vector database service.',
      contentHash: 'abc123',
      retrievedAt: new Date(),
    },
  ]),
}));

jest.mock('../../src/agents/writer', () => ({
  runWriter: jest.fn().mockResolvedValue({
    report: '# Research Report\n\n## Executive Summary\nBased on evidence [^1], pgvector and Pinecone differ significantly.\n\n## Sources\n[^1]: Vector Database Comparison - https://example.com/article\n\n## Confidence & Limitations\nThis report is based on available evidence.',
    citationMap: new Map([['evidence-1', ['[^1]']]]),
  }),
}));

jest.mock('../../src/agents/critic', () => ({
  runCritic: jest.fn().mockResolvedValue({
    verdict: 'APPROVE',
    scores: { coverage: 0.85, citationDensity: 0.90, sourceDiversity: 0.75, internalConsistency: 0.95 },
  }),
}));

jest.mock('../../src/storage/repo', () => ({
  createRun: jest.fn().mockResolvedValue({
    id: 'test-run-id',
    question: 'test question',
    status: 'planning',
    totalTokens: 0,
    totalCostUsd: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateRunStatus: jest.fn().mockResolvedValue(undefined),
  getEvidenceByRunId: jest.fn().mockResolvedValue([
    {
      id: 'evidence-1',
      runId: 'test-run-id',
      url: 'https://example.com/article',
      title: 'Vector Database Comparison',
      content: 'pgvector is an open-source PostgreSQL extension.',
      contentHash: 'abc123',
      retrievedAt: new Date(),
    },
  ]),
  insertStep: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/core/tracing', () => ({
  initTracing: jest.fn(),
  shutdownTracing: jest.fn().mockResolvedValue(undefined),
  startSpan: jest.fn().mockReturnValue({}),
  endSpan: jest.fn(),
  endSpanWithError: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('runResearchLoop (integration)', () => {
  it('should complete a full research run', async () => {
    const result = await runResearchLoop({
      question: 'Compare pgvector vs Pinecone',
      budgetUsd: 1.0,
      maxSteps: 10,
      noCritic: false,
    });

    expect(result.runId).toBeDefined();
    expect(result.report).toBeTruthy();
    expect(result.plan.subQuestions.length).toBeGreaterThan(0);
    expect(result.isPartial).toBe(false);
  });

  it('should handle noCritic option', async () => {
    const result = await runResearchLoop({
      question: 'What is pgvector?',
      budgetUsd: 1.0,
      maxSteps: 5,
      noCritic: true,
    });

    expect(result.report).toBeTruthy();
  });
});
