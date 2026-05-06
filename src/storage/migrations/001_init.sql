CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  total_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  url TEXT,
  title TEXT,
  publisher TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT now(),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding VECTOR(1536),
  UNIQUE(run_id, content_hash)
);

CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  parent_step_id UUID,
  agent TEXT NOT NULL,
  tool TEXT,
  input JSONB,
  output JSONB,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
