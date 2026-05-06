# AI Research Agent

An autonomous research agent that answers complex questions using a **Plan → Execute → Observe → Reflect** loop with cited evidence.

## Quickstart

```bash
# Start PostgreSQL with pgvector
docker compose up -d postgres

# Install dependencies
npm install

# Copy and fill in your API keys
cp .env.example .env

# Run a research query
npm start -- "Compare pgvector vs Pinecone for RAG applications"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Research Loop                         │
│                                                          │
│  Question → [Planner] → Plan (sub-questions)            │
│                ↓                                         │
│         [Executor × N]  (ReAct loop per sub-question)   │
│           ↙    ↓    ↘                                   │
│      Search  Fetch  Summarize                            │
│           ↘    ↓    ↙                                   │
│         Evidence Store (pgvector)                        │
│                ↓                                         │
│           [Writer]  (synthesizes cited report)           │
│                ↓                                         │
│           [Critic]  (scores + requests revision)         │
│                ↓                                         │
│         Final Report (Markdown)                          │
└─────────────────────────────────────────────────────────┘
```

## CLI Usage

```bash
npm start -- "<question>" [options]

Options:
  --budget-usd <amount>    Max cost in USD (default: 1.00)
  --max-steps <n>          Max tool calls (default: 50)
  --model-strong <model>   Strong model (default: gpt-4o)
  --model-cheap <model>    Cheap model (default: gpt-4o-mini)
  --no-critic              Skip critic evaluation
  --out-dir <dir>          Output directory (default: ./out)
```

## Tradeoffs

### Plan-and-Execute vs Pure ReAct
The agent uses a two-level architecture: a **Planner** decomposes the question into sub-questions, and each sub-question is handled by an independent **Executor** ReAct loop. This provides better coverage than a single ReAct loop but adds latency. Pure ReAct is more flexible but harder to budget-cap and parallelize.

### Evidence Deduplication
Content is hashed (SHA-256) before storage with a unique constraint on `(run_id, content_hash)`. This prevents duplicate snippets from inflating the evidence set but may miss near-duplicate content with different formatting.

### Budget Management
Hard caps on tokens, USD cost, wall-clock time, and tool calls ensure the agent never exceeds budget. When a cap is hit, the run is marked `isPartial=true` and the writer synthesizes from whatever evidence was collected.

## What I'd Do With Another Week

1. **Parallel sub-question execution** – Run all Executors concurrently with a shared evidence pool
2. **Streaming output** – Stream the report token-by-token via SSE for better UX
3. **Citation verification** – Cross-check each citation against its source content
4. **Better chunking** – Split long documents into overlapping chunks before embedding
5. **Human-in-the-loop** – Add a mid-run approval step for high-stakes queries

## Known Failure Modes

1. **Hallucination under sparse evidence** – Writer may speculate when evidence doesn't cover a sub-question; mitigated by "insufficient evidence" instruction
2. **Search API rate limits** – Retry logic handles transient failures, but sustained rate limiting will cause partial results
3. **LLM JSON parsing failures** – ReAct loop breaks on malformed JSON responses; fallback exits the loop gracefully
