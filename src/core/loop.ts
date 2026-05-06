import { Plan, Evidence } from './types';
import { BudgetTracker, BudgetExceededError } from './budget';
import { runPlanner } from '../agents/planner';
import { runExecutor } from '../agents/executor';
import { runCritic } from '../agents/critic';
import { runWriter } from '../agents/writer';
import { createRun, updateRunStatus, getEvidenceByRunId } from '../storage/repo';
import { initTracing, shutdownTracing } from './tracing';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface RunConfig {
  question: string;
  budgetUsd?: number;
  maxSteps?: number;
  modelStrong?: string;
  modelCheap?: string;
  seed?: number;
  noCritic?: boolean;
  outDir?: string;
}

export interface RunResult {
  runId: string;
  report: string;
  plan: Plan;
  evidence: Evidence[];
  isPartial: boolean;
  summary: {
    toolCalls: number;
    tokens: number;
    costUsd: number;
    elapsedSeconds: number;
  };
}

export async function runResearchLoop(config: RunConfig): Promise<RunResult> {
  initTracing();

  const budgetUsd = config.budgetUsd ?? parseFloat(process.env.DEFAULT_BUDGET_USD || '1.00');
  const maxSteps = config.maxSteps ?? parseInt(process.env.DEFAULT_MAX_STEPS || '50');
  const maxTokens = parseInt(process.env.DEFAULT_MAX_TOKENS || '100000');
  const maxSeconds = parseInt(process.env.DEFAULT_TIMEOUT_SECONDS || '300');

  if (config.modelStrong) process.env.STRONG_MODEL = config.modelStrong;
  if (config.modelCheap) process.env.CHEAP_MODEL = config.modelCheap;

  const budget = new BudgetTracker({
    maxUSD: budgetUsd,
    maxTokens,
    maxSeconds,
    maxToolCalls: maxSteps,
  });

  let run;
  try {
    run = await createRun(config.question);
  } catch {
    run = { id: `run-${Date.now()}`, question: config.question, status: 'planning', totalTokens: 0, totalCostUsd: 0, createdAt: new Date(), updatedAt: new Date() };
  }

  const runId = run.id;
  let plan: Plan | undefined;
  const allEvidence: Evidence[] = [];
  let report = '';
  let isPartial = false;

  const handleShutdown = async () => {
    console.log('\n[loop] Shutting down gracefully...');
    try {
      await updateRunStatus(runId, 'failed');
    } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  try {
    await updateRunStatus(runId, 'planning').catch(() => {});
    plan = await runPlanner(config.question, runId);

    await updateRunStatus(runId, 'executing').catch(() => {});
    for (const idx of plan.researchOrder) {
      try {
        budget.checkTime();
        budget.check();
      } catch (e) {
        if (e instanceof BudgetExceededError) {
          console.log(`[loop] Budget exceeded during execution: ${e.message}`);
          isPartial = true;
          break;
        }
      }

      try {
        const evidence = await runExecutor(plan, idx, runId, budget);
        allEvidence.push(...evidence);
      } catch (e) {
        if (e instanceof BudgetExceededError) {
          isPartial = true;
          break;
        }
        console.error(`[executor] Error for sub-question ${idx}: ${(e as Error).message}`);
      }
    }

    let dbEvidence: Evidence[] = [];
    try {
      dbEvidence = await getEvidenceByRunId(runId);
    } catch {
      dbEvidence = allEvidence;
    }

    const evidence = dbEvidence.length > 0 ? dbEvidence : allEvidence;

    await updateRunStatus(runId, 'writing').catch(() => {});
    const writerResult = await runWriter(plan, evidence, config.question);
    report = writerResult.report;

    if (!config.noCritic && evidence.length > 0) {
      let revisions = 0;
      const maxRevisions = 2;

      while (revisions < maxRevisions) {
        const criticResult = await runCritic(report, evidence, config.question);

        if (criticResult.verdict === 'APPROVE') {
          console.log('[critic] Report approved');
          break;
        }

        revisions++;
        console.log(`[critic] Revision ${revisions}/${maxRevisions} requested`);

        if (revisions <= maxRevisions) {
          const revised = await runWriter(plan, evidence, config.question, criticResult.revisionRequest);
          report = revised.report;
        }
      }
    }

    const outDir = config.outDir || './out';
    const runOutDir = join(outDir, `run_${runId}`);
    try {
      mkdirSync(runOutDir, { recursive: true });
      writeFileSync(join(runOutDir, 'report.md'), report);
      console.log(`[writer] final report written to ${join(runOutDir, 'report.md')}`);
    } catch (e) {
      console.error(`[loop] Failed to write output: ${(e as Error).message}`);
    }

    const summary = budget.getSummary();
    await updateRunStatus(runId, 'done', summary.tokens, summary.costUsd).catch(() => {});

    console.log(`[summary] ${summary.toolCalls} tool calls · ${summary.tokens.toLocaleString()} tokens · $${summary.costUsd.toFixed(2)} · ${summary.elapsedSeconds.toFixed(0)}s`);

  } catch (error) {
    isPartial = true;
    await updateRunStatus(runId, 'failed').catch(() => {});
    throw error;
  } finally {
    process.removeListener('SIGINT', handleShutdown);
    process.removeListener('SIGTERM', handleShutdown);
    await shutdownTracing();
  }

  const summary = budget.getSummary();
  return {
    runId,
    report,
    plan: plan!,
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
