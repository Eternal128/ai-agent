export interface Run {
  id: string;
  question: string;
  status: string;
  totalTokens: number;
  totalCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  id: string;
  runId: string;
  url?: string;
  title?: string;
  publisher?: string;
  retrievedAt: Date;
  content: string;
  contentHash: string;
  embedding?: number[];
}

export interface Step {
  id: string;
  runId: string;
  parentStepId?: string;
  agent: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  createdAt: Date;
}

export interface Plan {
  subQuestions: string[];
  researchOrder: number[];
  estimatedSteps: number;
}

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string;
}

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  publisher?: string;
}

export interface SummarizeResult {
  summary: string;
  tokensUsed: number;
}

export interface Claim {
  claim: string;
  startOffset: number;
  endOffset: number;
}

export interface ExtractClaimsResult {
  claims: Claim[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string;
}

export interface CriticResult {
  verdict: 'APPROVE' | 'REVISE';
  scores: {
    coverage: number;
    citationDensity: number;
    sourceDiversity: number;
    internalConsistency: number;
  };
  revisionRequest?: string;
}

export interface WriterResult {
  report: string;
  citationMap: Map<string, string[]>;
}
