interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * PhishTank MCP — wraps PhishTank API (checkurl.phishtank.com)
 *
 * Free, no authentication required. Checks whether a URL is a known phishing site.
 *
 * Tools:
 * - check_url: check if a URL is in the PhishTank phishing database
 */


const BASE_URL = 'https://checkurl.phishtank.com/checkurl/';

const tools: McpToolExport['tools'] = [
  {
    name: 'check_url',
    description:
      'Check if a URL is a known phishing site in the PhishTank database. Returns whether it is a phish, verification status, and details URL. Example: check_url("http://suspicious-site.example.com/login").',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to check for phishing (e.g., "http://example.com/fake-login")',
        },
      },
      required: ['url'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'check_url':
      return checkUrl(args.url as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function checkUrl(url: string) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      url,
      format: 'json',
    }).toString(),
  });
  if (!res.ok) throw new Error(`PhishTank API error: ${res.status}`);

  const data = (await res.json()) as {
    results: {
      url: string;
      in_database: boolean;
      phish_id?: string;
      phish_detail_page?: string;
      verified?: boolean;
      verified_at?: string;
      valid?: boolean;
    };
    meta: {
      timestamp: string;
    };
  };

  const r = data.results;
  return {
    url: r.url,
    in_database: r.in_database,
    is_phish: r.in_database && r.valid === true,
    phish_id: r.phish_id ?? null,
    detail_page: r.phish_detail_page ?? null,
    verified: r.verified ?? null,
    verified_at: r.verified_at ?? null,
    checked_at: data.meta.timestamp,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
