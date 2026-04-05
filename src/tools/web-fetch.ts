import { registerTool } from './registry.js';

registerTool({
  name: 'web_fetch',
  description: 'Fetch a URL and return its text content. Strips HTML tags for readability.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
      max_length: { type: 'number', description: 'Max response length in chars (default: 50000)' },
    },
    required: ['url'],
  },
  async execute(args) {
    const maxLen = args.max_length || 50000;
    try {
      const response = await fetch(args.url, {
        headers: { 'User-Agent': 'GrokCode/2.0 (AI Agent)' },
        redirect: 'follow',
      });
      if (!response.ok) {
        return { output: '', error: `HTTP ${response.status}: ${response.statusText}` };
      }
      let text = await response.text();
      // Strip HTML tags for readability
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      return {
        title: `fetch: ${args.url.slice(0, 60)}`,
        output: text.slice(0, maxLen),
      };
    } catch (err: any) {
      return { output: '', error: `Fetch failed: ${err.message}` };
    }
  },
});
