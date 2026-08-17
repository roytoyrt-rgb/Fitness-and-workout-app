// Server-side only. Runs inside Expo Router API routes (app/api/**/+api.ts),
// never bundled into the client. Reads the key from process.env directly —
// do NOT prefix it with EXPO_PUBLIC_ or it would ship in the client bundle.
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export class ClaudeConfigError extends Error {}

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new ClaudeConfigError(
      'ANTHROPIC_API_KEY is not set. Add it to a .env file at the project root (see README) and restart the dev server.'
    );
  }
  return key;
}

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: { type: 'base64'; media_type: string; data: string };
}

export async function callClaude(params: {
  system: string;
  content: ContentBlock[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: 'user', content: params.content }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Claude API error (${response.status}): ${errBody || response.statusText}`);
  }

  const json = await response.json();
  const textBlock = json.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Claude API returned no text content.');
  }
  return textBlock.text as string;
}

// Claude is asked to respond with JSON; models sometimes wrap it in a code
// fence despite instructions, so strip that defensively before parsing.
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as T;
}
