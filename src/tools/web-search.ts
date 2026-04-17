import { registerTool } from './registry.js';

registerTool({
  name: 'web_search',
  description: 'Search the web using DuckDuckGo. Returns titles, URLs, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      max_results: { type: 'number', description: 'Max results (default: 8)' },
    },
    required: ['query'],
  },
  async execute(args, context) {
    const maxResults = args.max_results || 8;
    // 15s timeout so DDG slow-downs / network blocks can't hang the agent.
    // Also honors agent-level abort signal (e.g. outer tool timeout).
    const abortCtl = new AbortController();
    const timeoutId = setTimeout(() => abortCtl.abort(), 15000);
    const onOuterAbort = () => abortCtl.abort();
    if (context?.signal) {
      if (context.signal.aborted) abortCtl.abort();
      else context.signal.addEventListener('abort', onOuterAbort, { once: true });
    }
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
      const response = await fetch(url, {
        signal: abortCtl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const html = await response.text();

      // Parse results from DDG HTML
      const results: string[] = [];
      const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

      let match;
      const urls: string[] = [];
      const titles: string[] = [];
      while ((match = linkRegex.exec(html)) !== null && urls.length < maxResults) {
        let href = match[1];
        // DDG wraps URLs in a redirect
        const uddg = href.match(/uddg=([^&]+)/);
        if (uddg) href = decodeURIComponent(uddg[1]);
        urls.push(href);
        titles.push(match[2].replace(/<[^>]+>/g, '').trim());
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
      }

      for (let i = 0; i < urls.length; i++) {
        results.push(`${i + 1}. ${titles[i]}\n   ${urls[i]}\n   ${snippets[i] || ''}`);
      }

      if (results.length === 0) {
        return { title: 'web_search', output: `No results for "${args.query}"` };
      }
      return { title: `search: ${args.query}`, output: results.join('\n\n') };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { output: '', error: `Search timed out or was aborted` };
      }
      return { output: '', error: `Search failed: ${err.message}` };
    } finally {
      clearTimeout(timeoutId);
      if (context?.signal) context.signal.removeEventListener('abort', onOuterAbort);
    }
  },
});
