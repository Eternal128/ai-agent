"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWriter = runWriter;
const llm_1 = require("../core/llm");
const tracing_1 = require("../core/tracing");
async function runWriter(plan, evidence, question, revisionRequest) {
    const span = (0, tracing_1.startSpan)('writer', { question: question.slice(0, 100), evidenceCount: evidence.length });
    const evidenceList = evidence
        .slice(0, 30)
        .map((e, i) => `[E${i + 1}] (id:${e.id}) Source: ${e.title || e.url || 'Unknown'}\nURL: ${e.url || 'N/A'}\n${e.content.slice(0, 800)}`)
        .join('\n\n---\n\n');
    const revisionNote = revisionRequest
        ? `\n\nIMPORTANT REVISION REQUEST:\n${revisionRequest}`
        : '';
    const messages = [
        {
            role: 'system',
            content: `You are a research report writer. Write a comprehensive, well-cited report.

CRITICAL RULES:
1. Every factual claim MUST have an inline citation [^N] referencing an evidence ID
2. Only use facts from the provided evidence - DO NOT invent facts
3. If evidence doesn't cover something, explicitly state "insufficient evidence"
4. Structure: Executive Summary, then sections per sub-question, then Sources, then Confidence & Limitations
5. Citations format: [^1] for first source, [^2] for second, etc.
6. Include a ## Sources section at the end listing all cited evidence
7. End with ## Confidence & Limitations section

${revisionNote}`,
        },
        {
            role: 'user',
            content: `Original question: ${question}

Research sub-questions addressed:
${plan.subQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Evidence collected (${evidence.length} sources):
${evidenceList}

Write the complete research report:`,
        },
    ];
    try {
        const response = await (0, llm_1.callLLM)({
            model: llm_1.STRONG_MODEL,
            messages,
            temperature: 0.1,
            maxTokens: 6000,
        });
        const report = response.content;
        const citationMap = new Map();
        const citationRegex = /\[\^(\d+)\]/g;
        let match;
        while ((match = citationRegex.exec(report)) !== null) {
            const citNum = parseInt(match[1]);
            const ev = evidence[citNum - 1];
            if (ev) {
                if (!citationMap.has(ev.id)) {
                    citationMap.set(ev.id, []);
                }
                const existing = citationMap.get(ev.id);
                if (existing) {
                    existing.push(match[0]);
                }
            }
        }
        const sentences = report.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const citedSentences = sentences.filter(s => /\[\^\d+\]/.test(s));
        const uncitedRatio = sentences.length > 0 ? 1 - citedSentences.length / sentences.length : 0;
        if (uncitedRatio > 0.05) {
            console.warn(`[writer] WARNING: ${(uncitedRatio * 100).toFixed(1)}% of sentences may lack citations`);
        }
        (0, tracing_1.endSpan)(span, { reportLength: report.length, citationCount: citationMap.size });
        console.log(`[writer] report written (${report.length} chars, ${citationMap.size} cited sources)`);
        return { report, citationMap };
    }
    catch (error) {
        (0, tracing_1.endSpanWithError)(span, error);
        throw error;
    }
}
//# sourceMappingURL=writer.js.map