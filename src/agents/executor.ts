import { callLLM, STRONG_MODEL } from '../core/llm';
import { Plan, Evidence, LLMMessage, FetchResult, SearchResult } from '../core/types';
import { toolRegistry, ToolName, getToolDescriptions } from '../tools/index';
import { BudgetTracker, BudgetExceededError } from '../core/budget';
import { startSpan, endSpan, endSpanWithError } from '../core/tracing';
import { createHash } from 'crypto';
import { insertEvidence } from '../storage/repo';

const MAX_STEPS = 8;

interface ReActStep {
  thought: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  observation?: string;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function storeEvidence(
  runId: string,
  url: string | undefined,
  title: string | undefined,
  content: string,
  publisher?: string
): Promise<Evidence | null> {
  const contentHash = hashContent(content);
  return insertEvidence({
    runId,
    url,
    title,
    publisher,
    content,
    contentHash,
  });
}

export async function runExecutor(
  plan: Plan,
  subQuestionIndex: number,
  runId: string,
  budget: BudgetTracker
): Promise<Evidence[]> {
  const subQuestion = plan.subQuestions[subQuestionIndex];
  const span = startSpan('executor', { subQuestion: subQuestion.slice(0, 100), runId });
  const collectedEvidence: Evidence[] = [];
  const steps: ReActStep[] = [];

  console.log(`\n[executor:${subQuestionIndex + 1}/${plan.subQuestions.length}] sub-question: ${subQuestion}`);

  const systemPrompt = `You are a research agent using ReAct (Reason + Act) methodology.

Available tools:
${getToolDescriptions()}
- done: Finish research for this sub-question (no input needed)

For each step, respond with EXACTLY this JSON format:
{
  "thought": "Your reasoning about what to do next",
  "action": "tool_name or done",
  "action_input": { ... } or null
}

Rules:
1. Always use vector_search FIRST to check existing evidence before web_search
2. Fetch URLs found in search results for full content
3. Summarize long content to extract key facts
4. Call "done" when you have sufficient evidence or after 8 steps
5. Never repeat the same search query`;

  for (let step = 0; step < MAX_STEPS; step++) {
    try {
      budget.check();
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        console.log(`[executor] budget exceeded: ${e.message}`);
        break;
      }
    }

    const historyText = steps.map((s, i) =>
      `Step ${i + 1}:\nThought: ${s.thought}\nAction: ${s.action}\nInput: ${JSON.stringify(s.actionInput)}\nObservation: ${s.observation}`
    ).join('\n\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Research sub-question: ${subQuestion}\n\nRun ID for vector_search: ${runId}\n\n${historyText ? `Previous steps:\n${historyText}\n\n` : ''}What is your next step?`,
      },
    ];

    let response;
    try {
      const startTime = Date.now();
      response = await callLLM({ model: STRONG_MODEL, messages, temperature: 0 });
      budget.addTokens(response.tokensIn + response.tokensOut);
      budget.addCost(response.costUsd);
      console.log(`  step ${step + 1}: llm call (${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error(`[executor] LLM error: ${(error as Error).message}`);
      break;
    }

    let parsed: { thought: string; action: string; action_input: Record<string, unknown> | null };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
    } catch {
      console.error('[executor] Failed to parse step JSON');
      break;
    }

    const currentStep: ReActStep = {
      thought: parsed.thought,
      action: parsed.action,
      actionInput: parsed.action_input || undefined,
    };

    if (parsed.action === 'done') {
      currentStep.observation = 'Research complete';
      steps.push(currentStep);
      break;
    }

    const toolName = parsed.action as ToolName;
    const tool = toolRegistry[toolName];

    if (!tool) {
      currentStep.observation = `Unknown tool: ${toolName}`;
      steps.push(currentStep);
      continue;
    }

    const toolStart = Date.now();
    budget.addToolCall();

    try {
      const toolResult = await tool.execute(parsed.action_input || {});
      const toolLatency = Date.now() - toolStart;
      console.log(`  [executor:${subQuestionIndex + 1}] tool=${toolName} (${toolLatency}ms)`);

      if (!toolResult.ok) {
        currentStep.observation = `Tool error: ${toolResult.error.message}`;
      } else {
        const data = toolResult.data;
        currentStep.observation = JSON.stringify(data).slice(0, 2000);

        if (toolName === 'fetch_url') {
          const fetchData = data as FetchResult;
          const evidence = await storeEvidence(runId, fetchData.url, fetchData.title, fetchData.content, fetchData.publisher);
          if (evidence) {
            collectedEvidence.push(evidence);
            console.log(`    stored evidence: ${fetchData.url}`);
          }
        }

        if (toolName === 'web_search') {
          const searchData = data as SearchResult[];
          for (const result of searchData) {
            if (result.snippet && result.snippet.length > 100) {
              const evidence = await storeEvidence(runId, result.url, result.title, result.snippet);
              if (evidence) {
                collectedEvidence.push(evidence);
              }
            }
          }
        }
      }
    } catch (error) {
      currentStep.observation = `Tool execution error: ${(error as Error).message}`;
    }

    steps.push(currentStep);
  }

  endSpan(span, { evidenceCollected: collectedEvidence.length, stepsUsed: steps.length });
  return collectedEvidence;
}
