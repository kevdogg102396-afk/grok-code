import { registerTool } from './registry.js';

// Block private/internal IP ranges and cloud metadata endpoints
function isBlockedUrl(urlStr: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return 'Invalid URL';
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block common cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return 'Cloud metadata endpoint blocked';
  }

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return 'Localhost access blocked';
  }

  // Block private IP ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return 'Private IP range (10.x.x.x) blocked';
    if (a === 172 && b >= 16 && b <= 31) return 'Private IP range (172.16-31.x.x) blocked';
    if (a === 192 && b === 168) return 'Private IP range (192.168.x.x) blocked';
    if (a === 169 && b === 254) return 'Link-local IP range blocked';
    if (a === 0) return 'Zero network blocked';
  }

  // Block file:// and other non-http schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Blocked protocol: ${parsed.protocol}`;
  }

  return null;
}

registerTool({
  name: 'web_fetch',
  description: 'Fetch a URL and return its text content. Strips HTML tags for readability. Blocks private/internal IPs for security.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch (must be http/https, no private IPs)' },
      max_length: { type: 'number', description: 'Max response length in chars (default: 50000)' },
    },
    required: ['url'],
  },
  async execute(args) {
    const maxLen = args.max_length || 50000;

    // SSRF protection: block private IPs, localhost, cloud metadata
    const blocked = isBlockedUrl(args.url);
    if (blocked) {
      return { output: '', error: `Blocked: ${blocked}` };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s fetch timeout

      const response = await fetch(args.url, {
        headers: { 'User-Agent': 'GrokCode/2.0 (AI Agent)' },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { output: '', error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Check for redirect to blocked URLs
      if (response.url !== args.url) {
        const redirectBlocked = isBlockedUrl(response.url);
        if (redirectBlocked) {
          return { output: '', error: `Blocked redirect to: ${redirectBlocked}` };
        }
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
