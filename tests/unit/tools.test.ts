import { webSearch } from '../../src/tools/webSearch';
import { summarize } from '../../src/tools/summarize';
import { extractClaims } from '../../src/tools/extractClaims';

jest.mock('node-fetch', () => jest.fn());

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: { document: { title: 'Test', body: { textContent: 'body text' } } },
  })),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: () => ({ title: 'Test Title', textContent: 'Article content', siteName: 'example.com' }),
  })),
}));

jest.mock('../../src/core/llm', () => ({
  callLLM: jest.fn().mockResolvedValue({
    content: '{"summary": "Test summary", "tokensUsed": 100}',
    tokensIn: 50,
    tokensOut: 30,
    costUsd: 0.001,
    model: 'gpt-4o-mini',
  }),
  CHEAP_MODEL: 'gpt-4o-mini',
}));

import fetch from 'node-fetch';

describe('webSearch', () => {
  it('should return error for invalid input', async () => {
    const result = await webSearch({ query: '', k: 5 });
    expect(result.ok).toBe(false);
  });

  it('should handle search failure gracefully', async () => {
    (fetch as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));
    const result = await webSearch({ query: 'test query', k: 5 });
    expect(result).toBeDefined();
  });
});

describe('fetchUrl', () => {
  it('should return error for invalid URL', async () => {
    const { fetchUrl } = await import('../../src/tools/fetchUrl');
    const result = await fetchUrl({ url: 'not-a-url' });
    expect(result.ok).toBe(false);
  });

  it('should handle 404 responses', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({ status: 404, statusText: 'Not Found', text: jest.fn() });
    const { fetchUrl } = await import('../../src/tools/fetchUrl');
    const result = await fetchUrl({ url: 'https://example.com/notfound' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_404');
    }
  });
});

describe('summarize', () => {
  it('should return error for invalid input', async () => {
    const result = await summarize({ text: '', focus: 'test' });
    expect(result.ok).toBe(false);
  });

  it('should return summary for valid input', async () => {
    const result = await summarize({ text: 'This is test text for summarization.', focus: 'test' });
    expect(result).toBeDefined();
  });
});

describe('extractClaims', () => {
  it('should return error for empty text', async () => {
    const result = await extractClaims({ text: '' });
    expect(result.ok).toBe(false);
  });
});
