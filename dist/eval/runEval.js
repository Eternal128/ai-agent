"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const loop_1 = require("../core/loop");
const judge_1 = require("./judge");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function loadBaseline() {
    const baselinePath = (0, path_1.join)(__dirname, 'results', 'baseline.json');
    if (!(0, fs_1.existsSync)(baselinePath))
        return null;
    try {
        const data = JSON.parse((0, fs_1.readFileSync)(baselinePath, 'utf-8'));
        return data.meanScore;
    }
    catch {
        return null;
    }
}
async function main() {
    const dataset = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'dataset.json'), 'utf-8'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = (0, path_1.join)(__dirname, 'results');
    (0, fs_1.mkdirSync)(resultsDir, { recursive: true });
    const results = [];
    let totalScore = 0;
    console.log(`[eval] Running ${dataset.length} questions...`);
    for (const entry of dataset) {
        console.log(`\n[eval] ${entry.id}: ${entry.question}`);
        const start = Date.now();
        try {
            const runResult = await (0, loop_1.runResearchLoop)({
                question: entry.question,
                budgetUsd: 0.5,
                maxSteps: 20,
                noCritic: false,
            });
            const judgeResult = await (0, judge_1.judgeReport)(runResult.report, entry);
            const elapsed = (Date.now() - start) / 1000;
            const result = {
                id: entry.id,
                category: entry.category,
                question: entry.question,
                scores: judgeResult.scores,
                reasoning: judgeResult.reasoning,
                passed: judgeResult.passed,
                runId: runResult.runId,
                elapsedSeconds: elapsed,
                tokens: runResult.summary.tokens,
                costUsd: runResult.summary.costUsd,
            };
            results.push(result);
            totalScore += judgeResult.scores.overall;
            console.log(`[eval] ${entry.id} overall=${judgeResult.scores.overall.toFixed(2)} passed=${judgeResult.passed}`);
        }
        catch (error) {
            console.error(`[eval] ${entry.id} failed: ${error.message}`);
        }
    }
    const meanScore = results.length > 0 ? totalScore / results.length : 0;
    console.log(`\n[eval] Mean score: ${meanScore.toFixed(3)}`);
    const baseline = await loadBaseline();
    if (baseline !== null && meanScore < baseline - 0.3) {
        console.error(`[eval] REGRESSION: mean score ${meanScore.toFixed(3)} < baseline ${baseline.toFixed(3)} - 0.3`);
        process.exit(1);
    }
    const resultsFile = (0, path_1.join)(resultsDir, `${timestamp}.json`);
    (0, fs_1.writeFileSync)(resultsFile, JSON.stringify({ timestamp, meanScore, results }, null, 2));
    console.log(`[eval] Results written to ${resultsFile}`);
    const leaderboard = `# Eval Leaderboard

Last run: ${timestamp}
Mean score: ${meanScore.toFixed(3)}

## Results by Category

${['technical_comparison', 'current_events', 'how_to', 'ambiguous'].map(cat => {
        const catResults = results.filter(r => r.category === cat);
        if (catResults.length === 0)
            return `### ${cat}\nNo results`;
        const catMean = catResults.reduce((s, r) => s + r.scores.overall, 0) / catResults.length;
        return `### ${cat}\nMean: ${catMean.toFixed(3)}\n${catResults.map(r => `- ${r.id}: ${r.scores.overall.toFixed(2)} ${r.passed ? '✓' : '✗'}`).join('\n')}`;
    }).join('\n\n')}

## All Results

| ID | Category | Overall | Factuality | Coverage | Citations | Structure | Concise |
|----|----------|---------|-----------|---------|-----------|-----------|---------|
${results.map(r => `| ${r.id} | ${r.category} | ${r.scores.overall.toFixed(2)} | ${r.scores.factuality.toFixed(1)} | ${r.scores.coverage.toFixed(1)} | ${r.scores.citationQuality.toFixed(1)} | ${r.scores.structure.toFixed(1)} | ${r.scores.conciseness.toFixed(1)} |`).join('\n')}
`;
    (0, fs_1.writeFileSync)((0, path_1.join)(resultsDir, 'leaderboard.md'), leaderboard);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=runEval.js.map