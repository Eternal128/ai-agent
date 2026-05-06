import { z } from 'zod';
import fetch from 'node-fetch';
import { ToolResult, SearchResult } from '../core/types';

export const WebSearchInputSchema = z.object({
  query: z.string().min(1),
  k: z.number().int().min(1).max(20).default(5),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchTavily(query: string, k: number): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not set');

  const response = await (fetch as unknown as (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>)(
    'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: k }),
      timeout: 10000,
    }
  );

  if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);
  const data = await response.json() as { results: Array<{ url: string; title: string; content: string; published_date?: string }> };
  return data.results.map(r => ({
    url: r.url,
    title: r.title,
    snippet: r.content,
    publishedAt: r.published_date,
  }));
}

async function searchBrave(query: string, k: number): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error('BRAVE_API_KEY not set');

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(k));

  const response = await (fetch as unknown as (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>)(
    url.toString(),
    {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
      timeout: 10000,
    }
  );

  if (!response.ok) throw new Error(`Brave API error: ${response.status}`);
  const data = await response.json() as { web?: { results: Array<{ url: string; title: string; description: string; page_age?: string }> } };
  return (data.web?.results || []).map(r => ({
    url: r.url,
    title: r.title,
    snippet: r.description,
    publishedAt: r.page_age,
  }));
}

async function searchDuckDuckGoFallback(query: string, k: number): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const response = await (fetch as unknown as (url: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>)(
    `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0)' },
      timeout: 10000,
    }
  );

  if (!response.ok) throw new Error(`DuckDuckGo error: ${response.status}`);
  const html = await response.text();

  const results: SearchResult[] = [];
  const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)/g;
  const snippetRegex = /class="result__snippet"[^>]*>([^<]+)/g;

  const links: string[] = [];
  const titles: string[] = [];
  const snippets: string[] = [];

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

export async function webSearch(input: WebSearchInput): Promise<ToolResult<SearchResult[]>> {
  const parsed = WebSearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
  }

  const { query, k } = parsed.data;
  const provider = process.env.SEARCH_PROVIDER || 'tavily';

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let results: SearchResult[];
      if (provider === 'tavily' && process.env.TAVILY_API_KEY) {
        results = await searchTavily(query, k);
      } else if (provider === 'brave' && process.env.BRAVE_API_KEY) {
        results = await searchBrave(query, k);
      } else {
        results = await searchDuckDuckGoFallback(query, k);
      }
      return { ok: true, data: results };
    } catch (error) {
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
  } catch {
    const err = lastError as Error;
    return { ok: false, error: { code: 'SEARCH_FAILED', message: err?.message || 'Search failed', details: lastError } };
  }
}
