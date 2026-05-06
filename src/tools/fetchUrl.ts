import { z } from 'zod';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ToolResult, FetchResult } from '../core/types';

export const FetchUrlInputSchema = z.object({
  url: z.string().url(),
});

export type FetchUrlInput = z.infer<typeof FetchUrlInputSchema>;

export async function fetchUrl(input: FetchUrlInput): Promise<ToolResult<FetchResult>> {
  const parsed = FetchUrlInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } };
  }

  const { url } = parsed.data;

  try {
    const response = await (fetch as unknown as (url: string, init?: Record<string, unknown>) => Promise<{ status: number; statusText: string; text: () => Promise<string> }>)(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://github.com/research-agent)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
      }
    );

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
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
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
  } catch (error) {
    const err = error as Error;
    if (err.name === 'AbortError' || err.name === 'TimeoutError' || err.message.includes('timeout')) {
      return { ok: false, error: { code: 'TIMEOUT', message: `Request timed out for ${url}` } };
    }
    return { ok: false, error: { code: 'FETCH_FAILED', message: err.message, details: { url } } };
  }
}
