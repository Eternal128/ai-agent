# Demo

## Example Run

```bash
npm start -- "Compare pgvector vs Pinecone vs Weaviate for RAG in 2024" --budget-usd 0.50
```

## Expected Output

```
[planner] decomposed into 5 sub-questions
  1. What is pgvector and how does it integrate with PostgreSQL?
  2. What are Pinecone's key features and pricing model?
  3. How does Weaviate differ from pgvector and Pinecone?
  4. What are the performance benchmarks for each database?
  5. What are the cost implications of each option at scale?

[executor:1/5] sub-question: What is pgvector...
  step 1: llm call (1243ms)
  [executor:1] tool=vector_search (12ms)
  step 2: llm call (987ms)
  [executor:1] tool=web_search (892ms)
    stored evidence: https://github.com/pgvector/pgvector
  ...

[writer] report written (8432 chars, 12 cited sources)
[critic] coverage=0.88 citations=0.92 diversity=0.85 consistency=0.97 mean=0.91 -> APPROVE
[summary] 23 tool calls · 45,231 tokens · $0.38 · 47s
```

The final report is saved to `./out/run_<id>/report.md`.
