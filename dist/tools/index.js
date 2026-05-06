"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorSearch = exports.extractClaims = exports.summarize = exports.fetchUrl = exports.webSearch = exports.toolRegistry = void 0;
exports.getToolNames = getToolNames;
exports.getToolDescriptions = getToolDescriptions;
const webSearch_1 = require("./webSearch");
Object.defineProperty(exports, "webSearch", { enumerable: true, get: function () { return webSearch_1.webSearch; } });
const fetchUrl_1 = require("./fetchUrl");
Object.defineProperty(exports, "fetchUrl", { enumerable: true, get: function () { return fetchUrl_1.fetchUrl; } });
const summarize_1 = require("./summarize");
Object.defineProperty(exports, "summarize", { enumerable: true, get: function () { return summarize_1.summarize; } });
const extractClaims_1 = require("./extractClaims");
Object.defineProperty(exports, "extractClaims", { enumerable: true, get: function () { return extractClaims_1.extractClaims; } });
const vectorSearch_1 = require("./vectorSearch");
Object.defineProperty(exports, "vectorSearch", { enumerable: true, get: function () { return vectorSearch_1.vectorSearch; } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.toolRegistry = {
    web_search: {
        name: 'web_search',
        description: 'Search the web for information. Input: {query, k?}. Output: array of {url, title, snippet, publishedAt?}',
        inputSchema: webSearch_1.WebSearchInputSchema,
        execute: (input) => (0, webSearch_1.webSearch)(input),
    },
    fetch_url: {
        name: 'fetch_url',
        description: 'Fetch and extract clean text from a URL. Input: {url}. Output: {url, title, content, publisher?}',
        inputSchema: fetchUrl_1.FetchUrlInputSchema,
        execute: (input) => (0, fetchUrl_1.fetchUrl)(input),
    },
    summarize: {
        name: 'summarize',
        description: 'Summarize text with a focus area. Input: {text, focus}. Output: {summary, tokensUsed}',
        inputSchema: summarize_1.SummarizeInputSchema,
        execute: (input) => (0, summarize_1.summarize)(input),
    },
    extract_claims: {
        name: 'extract_claims',
        description: 'Extract atomic factual claims from text. Input: {text}. Output: {claims: [{claim, startOffset, endOffset}]}',
        inputSchema: extractClaims_1.ExtractClaimsInputSchema,
        execute: (input) => (0, extractClaims_1.extractClaims)(input),
    },
    vector_search: {
        name: 'vector_search',
        description: 'Search existing evidence using semantic similarity. Input: {query, runId, limit?}. Output: Evidence[]',
        inputSchema: vectorSearch_1.VectorSearchInputSchema,
        execute: (input) => (0, vectorSearch_1.vectorSearch)(input),
    },
};
function getToolNames() {
    return Object.keys(exports.toolRegistry);
}
function getToolDescriptions() {
    return Object.values(exports.toolRegistry)
        .map(t => `- ${t.name}: ${t.description}`)
        .join('\n');
}
//# sourceMappingURL=index.js.map