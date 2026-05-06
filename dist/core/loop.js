"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runResearchLoop = runResearchLoop;
const budget_1 = require("./budget");
const planner_1 = require("../agents/planner");
const executor_1 = require("../agents/executor");
const critic_1 = require("../agents/critic");
const writer_1 = require("../agents/writer");
const repo_1 = require("../storage/repo");
const tracing_1 = require("./tracing");
const fs_1 = require("fs");
const path_1 = require("path");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function runResearchLoop(config) {
    (0, tracing_1.initTracing)();
    const budgetUsd = config.budgetUsd ?? parseFloat(process.env.DEFAULT_BUDGET_USD || '1.00');
    const maxSteps = config.maxSteps ?? parseInt(process.env.DEFAULT_MAX_STEPS || '50');
    const maxTokens = parseInt(process.env.DEFAULT_MAX_TOKENS || '100000');
    const maxSeconds = parseInt(process.env.DEFAULT_TIMEOUT_SECONDS || '300');
    if (config.modelStrong)
        process.env.STRONG_MODEL = config.modelStrong;
    if (config.modelCheap)
        process.env.CHEAP_MODEL = config.modelCheap;
    const budget = new budget_1.BudgetTracker({
        maxUSD: budgetUsd,
        maxTokens,
        maxSeconds,
        maxToolCalls: maxSteps,
    });
    let run;
    try {
        run = await (0, repo_1.createRun)(config.question);
    }
    catch {
        run = { id: `run-${Date.now()}`, question: config.question, status: 'planning', totalTokens: 0, totalCostUsd: 0, createdAt: new Date(), updatedAt: new Date() };
    }
    const runId = run.id;
    let plan;
    const allEvidence = [];
    let report = '';
    let isPartial = false;
    const handleShutdown = async () => {
        console.log('\n[loop] Shutting down gracefully...');
        try {
            await (0, repo_1.updateRunStatus)(runId, 'failed');
        }
        catch { /* ignore */ }
        process.exit(0);
    };
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    try {
        await (0, repo_1.updateRunStatus)(runId, 'planning').catch(() => { });
        plan = await (0, planner_1.runPlanner)(config.question, runId);
        await (0, repo_1.updateRunStatus)(runId, 'executing').catch(() => { });
        for (const idx of plan.researchOrder) {
            try {
                budget.checkTime();
                budget.check();
            }
            catch (e) {
                if (e instanceof budget_1.BudgetExceededError) {
                    console.log(`[loop] Budget exceeded during execution: ${e.message}`);
                    isPartial = true;
                    break;
                }
            }
            try {
                const evidence = await (0, executor_1.runExecutor)(plan, idx, runId, budget);
                allEvidence.push(...evidence);
            }
            catch (e) {
                if (e instanceof budget_1.BudgetExceededError) {
                    isPartial = true;
                    break;
                }
                console.error(`[executor] Error for sub-question ${idx}: ${e.message}`);
            }
        }
        let dbEvidence = [];
        try {
            dbEvidence = await (0, repo_1.getEvidenceByRunId)(runId);
        }
        catch {
            dbEvidence = allEvidence;
        }
        const evidence = dbEvidence.length > 0 ? dbEvidence : allEvidence;
        await (0, repo_1.updateRunStatus)(runId, 'writing').catch(() => { });
        const writerResult = await (0, writer_1.runWriter)(plan, evidence, config.question);
        report = writerResult.report;
        if (!config.noCritic && evidence.length > 0) {
            let revisions = 0;
            const maxRevisions = 2;
            while (revisions < maxRevisions) {
                const criticResult = await (0, critic_1.runCritic)(report, evidence, config.question);
                if (criticResult.verdict === 'APPROVE') {
                    console.log('[critic] Report approved');
                    break;
                }
                revisions++;
                console.log(`[critic] Revision ${revisions}/${maxRevisions} requested`);
                if (revisions <= maxRevisions) {
                    const revised = await (0, writer_1.runWriter)(plan, evidence, config.question, criticResult.revisionRequest);
                    report = revised.report;
                }
            }
        }
        const outDir = config.outDir || './out';
        const runOutDir = (0, path_1.join)(outDir, `run_${runId}`);
        try {
            (0, fs_1.mkdirSync)(runOutDir, { recursive: true });
            (0, fs_1.writeFileSync)((0, path_1.join)(runOutDir, 'report.md'), report);
            console.log(`[writer] final report written to ${(0, path_1.join)(runOutDir, 'report.md')}`);
        }
        catch (e) {
            console.error(`[loop] Failed to write output: ${e.message}`);
        }
        const summary = budget.getSummary();
        await (0, repo_1.updateRunStatus)(runId, 'done', summary.tokens, summary.costUsd).catch(() => { });
        console.log(`[summary] ${summary.toolCalls} tool calls · ${summary.tokens.toLocaleString()} tokens · $${summary.costUsd.toFixed(2)} · ${summary.elapsedSeconds.toFixed(0)}s`);
    }
    catch (error) {
        isPartial = true;
        await (0, repo_1.updateRunStatus)(runId, 'failed').catch(() => { });
        throw error;
    }
    finally {
        process.removeListener('SIGINT', handleShutdown);
        process.removeListener('SIGTERM', handleShutdown);
        await (0, tracing_1.shutdownTracing)();
    }
    const summary = budget.getSummary();
    return {
        runId,
        report,
        plan: plan,
        evidence: allEvidence,
        isPartial,
        summary: {
            toolCalls: summary.toolCalls,
            tokens: summary.tokens,
            costUsd: summary.costUsd,
            elapsedSeconds: summary.elapsedSeconds,
        },
    };
}
//# sourceMappingURL=loop.js.map