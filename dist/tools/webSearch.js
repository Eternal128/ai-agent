"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSearchInputSchema = void 0;
exports.webSearch = webSearch;
const zod_1 = require("zod");
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.WebSearchInputSchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    k: zod_1.z.number().int().min(1).max(20).default(5),
});
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function searchTavily(query, k) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey)
        throw new Error('TAVILY_API_KEY not set');
    const response = await node_fetch_1.default('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query, max_results: k }),
        timeout: 10000,
    });
    if (!response.ok)
        throw new Error(`Tavily API error: ${response.status}`);
    const data = await response.json();
    return data.results.map(r => ({
        url: r.url,
        title: r.title,
        snippet: r.content,
        publishedAt: r.published_date,
    }));
}
async function searchBrave(query, k) {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey)
        throw new Error('BRAVE_API_KEY not set');
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(k));
    const response = await node_fetch_1.default(url.toString(), {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
        timeout: 10000,
    });
    if (!response.ok)
        throw new Error(`Brave API error: ${response.status}`);
    const data = await response.json();
    return (data.web?.results || []).map(r => ({
        url: r.url,
        title: r.title,
        snippet: r.description,
        publishedAt: r.page_age,
    }));
}
async function searchDuckDuckGoFallback(query, k) {
    const encodedQuery = encodeURIComponent(query);
    const response = await node_fetch_1.default(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0)' },
        timeout: 10000,
    });
    if (!response.ok)
        throw new Error(`DuckDuckGo error: ${response.status}`);
    const html = await response.text();
    const results = [];
    const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)/g;
    const snippetRegex = /class="result__snippet"[^>]*>([^<]+)/g;
    const links = [];
    const titles = [];
    const snippets = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null && links.length < k) {
        links.push(match[1]);
        titles.push(match[2].trim());
    }
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < k) {
        snippets.push(match[1].trim());
    }
    for (let i = 0; i < Math.min(links.length, k); i++) {
        results.push({
            url: links[i],
            title: titles[i] || '',
            snippet: snippets[i] || '',
        });
    }
    return results;
}
async function webSearch(input) {
    const parsed = exports.WebSearchInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
    }
    const { query, k } = parsed.data;
    const provider = process.env.SEARCH_PROVIDER || 'tavily';
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            let results;
            if (provider === 'tavily' && process.env.TAVILY_API_KEY) {
                results = await searchTavily(query, k);
            }
            else if (provider === 'brave' && process.env.BRAVE_API_KEY) {
                results = await searchBrave(query, k);
            }
            else {
                results = await searchDuckDuckGoFallback(query, k);
            }
            return { ok: true, data: results };
        }
        catch (error) {
            lastError = error;
            if (attempt < 3) {
                await sleep(Math.pow(2, attempt) * 500);
            }
        }
    }
    // Final fallback to DuckDuckGo
    try {
        const results = await searchDuckDuckGoFallback(query, k);
        return { ok: true, data: results };
    }
    catch {
        const err = lastError;
        return { ok: false, error: { code: 'SEARCH_FAILED', message: err?.message || 'Search failed', details: lastError } };
    }
}
//# sourceMappingURL=webSearch.js.map