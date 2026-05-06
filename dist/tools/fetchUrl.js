"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchUrlInputSchema = void 0;
exports.fetchUrl = fetchUrl;
const zod_1 = require("zod");
const node_fetch_1 = __importDefault(require("node-fetch"));
const jsdom_1 = require("jsdom");
const readability_1 = require("@mozilla/readability");
exports.FetchUrlInputSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
});
async function fetchUrl(input) {
    const parsed = exports.FetchUrlInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
    }
    const { url } = parsed.data;
    try {
        const response = await node_fetch_1.default(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://github.com/research-agent)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 10000,
        });
        if (response.status >= 400) {
            return {
                ok: false,
                error: {
                    code: `HTTP_${response.status}`,
                    message: `HTTP error ${response.status}: ${response.statusText}`,
                    details: { url, status: response.status },
                },
            };
        }
        const html = await response.text();
        const dom = new jsdom_1.JSDOM(html, { url });
        const reader = new readability_1.Readability(dom.window.document);
        const article = reader.parse();
        if (!article) {
            const bodyText = dom.window.document.body?.textContent?.trim() || '';
            return {
                ok: true,
                data: {
                    url,
                    title: dom.window.document.title || url,
                    content: bodyText.slice(0, 50000),
                    publisher: new URL(url).hostname,
                },
            };
        }
        return {
            ok: true,
            data: {
                url,
                title: article.title || dom.window.document.title || url,
                content: (article.textContent || '').slice(0, 50000),
                publisher: article.siteName || new URL(url).hostname,
            },
        };
    }
    catch (error) {
        const err = error;
        if (err.name === 'AbortError' || err.name === 'TimeoutError' || err.message.includes('timeout')) {
            return { ok: false, error: { code: 'TIMEOUT', message: `Request timed out for ${url}` } };
        }
        return { ok: false, error: { code: 'FETCH_FAILED', message: err.message, details: { url } } };
    }
}
//# sourceMappingURL=fetchUrl.js.map