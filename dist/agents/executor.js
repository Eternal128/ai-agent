"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExecutor = runExecutor;
const llm_1 = require("../core/llm");
const index_1 = require("../tools/index");
const budget_1 = require("../core/budget");
const tracing_1 = require("../core/tracing");
const crypto_1 = require("crypto");
const repo_1 = require("../storage/repo");
const MAX_STEPS = 8;
function hashContent(content) {
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
async function storeEvidence(runId, url, title, content, publisher) {
    const contentHash = hashContent(content);
    return (0, repo_1.insertEvidence)({
        runId,
        url,
        title,
        publisher,
        content,
        contentHash,
    });
}
async function runExecutor(plan, subQuestionIndex, runId, budget) {
    const subQuestion = plan.subQuestions[subQuestionIndex];
    const span = (0, tracing_1.startSpan)('executor', { subQuestion: subQuestion.slice(0, 100), runId });
    const collectedEvidence = [];
    const steps = [];
    console.log(`\n[executor:${subQuestionIndex + 1}/${plan.subQuestions.length}] sub-question: ${subQuestion}`);
    const systemPrompt = `You are a research agent using ReAct (Reason + Act) methodology.

Available tools:
${(0, index_1.getToolDescriptions)()}
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
        }
        catch (e) {
            if (e instanceof budget_1.BudgetExceededError) {
                console.log(`[executor] budget exceeded: ${e.message}`);
                break;
            }
        }
        const historyText = steps.map((s, i) => `Step ${i + 1}:\nThought: ${s.thought}\nAction: ${s.action}\nInput: ${JSON.stringify(s.actionInput)}\nObservation: ${s.observation}`).join('\n\n');
        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Research sub-question: ${subQuestion}\n\nRun ID for vector_search: ${runId}\n\n${historyText ? `Previous steps:\n${historyText}\n\n` : ''}What is your next step?`,
            },
        ];
        let response;
        try {
            const startTime = Date.now();
            response = await (0, llm_1.callLLM)({ model: llm_1.STRONG_MODEL, messages, temperature: 0 });
            budget.addTokens(response.tokensIn + response.tokensOut);
            budget.addCost(response.costUsd);
            console.log(`  step ${step + 1}: llm call (${Date.now() - startTime}ms)`);
        }
        catch (error) {
            console.error(`[executor] LLM error: ${error.message}`);
            break;
        }
        let parsed;
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON in response');
            parsed = JSON.parse(jsonMatch[0]);
        }
        catch {
            console.error('[executor] Failed to parse step JSON');
            break;
        }
        const currentStep = {
            thought: parsed.thought,
            action: parsed.action,
            actionInput: parsed.action_input || undefined,
        };
        if (parsed.action === 'done') {
            currentStep.observation = 'Research complete';
            steps.push(currentStep);
            break;
        }
        const toolName = parsed.action;
        const tool = index_1.toolRegistry[toolName];
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
            }
            else {
                const data = toolResult.data;
                currentStep.observation = JSON.stringify(data).slice(0, 2000);
                if (toolName === 'fetch_url') {
                    const fetchData = data;
                    const evidence = await storeEvidence(runId, fetchData.url, fetchData.title, fetchData.content, fetchData.publisher);
                    if (evidence) {
                        collectedEvidence.push(evidence);
                        console.log(`    stored evidence: ${fetchData.url}`);
                    }
                }
                if (toolName === 'web_search') {
                    const searchData = data;
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
        }
        catch (error) {
            currentStep.observation = `Tool execution error: ${error.message}`;
        }
        steps.push(currentStep);
    }
    (0, tracing_1.endSpan)(span, { evidenceCollected: collectedEvidence.length, stepsUsed: steps.length });
    return collectedEvidence;
}
//# sourceMappingURL=executor.js.map