# ADR-001: Plan-and-Execute Architecture

## Status
Accepted

## Context
We need to answer complex, multi-faceted research questions. A single LLM call cannot handle the breadth of information required. We considered:

1. **Single ReAct loop** – One agent with unlimited steps
2. **Plan-and-Execute** – Planner decomposes, then N parallel executors
3. **Multi-agent graph** – Specialized agents with message passing

## Decision
Use **Plan-and-Execute** with sequential sub-question execution.

The Planner uses `gpt-4o` to decompose the question into 3-7 sub-questions with a research order. Each sub-question is handled by an independent Executor ReAct loop (max 8 steps). The Writer then synthesizes all evidence.

## Consequences
- **Pro**: Budget-predictable (8 steps × N sub-questions = hard ceiling)
- **Pro**: Sub-questions can be parallelized in a future iteration
- **Pro**: Planner output is auditable and debuggable
- **Con**: Sequential execution is slower than a single ReAct loop
- **Con**: Planner may decompose poorly for ambiguous questions
