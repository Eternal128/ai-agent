# Evaluation Framework

## Dataset
20 questions across 4 categories:
- `technical_comparison` (5): Database/framework comparisons
- `current_events` (5): Recent AI developments
- `how_to` (5): Implementation guides
- `ambiguous` (5): Open-ended questions requiring nuanced answers

## Judge
LLM-as-judge using `gpt-4o-mini` scoring 0-5 on:
- **Factuality**: Accuracy of claims, absence of hallucinations
- **Coverage**: All required topics addressed
- **Citation Quality**: Inline citations present and correct
- **Structure**: Clear sections, executive summary, sources
- **Conciseness**: Appropriate depth without padding

Pass threshold: mean score ≥ 3.0

## Regression Guard
Running `npm run eval` stores results in `src/eval/results/`. If a `baseline.json` exists and the new mean score drops by more than 0.3, the process exits with code 1.

## Running Evals
```bash
npm run eval
```
Results written to `src/eval/results/<timestamp>.json` and `leaderboard.md`.
