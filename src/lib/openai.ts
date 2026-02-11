// ============================================================================
// OpenAI API Client for AI Assistant
// ============================================================================

import { KANATA_SYNTAX_REFERENCE } from './kanata/syntax-reference';
import { KEY_LABELS } from './kanata/keys';

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_KEY_API_KEY = 'kanataui-openai-key';
const LS_KEY_BASE_URL = 'kanataui-openai-base-url';
const LS_KEY_MODEL = 'kanataui-openai-model';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Read OpenAI configuration from localStorage. */
export function getOpenAIConfig(): OpenAIConfig {
  return {
    apiKey: localStorage.getItem(LS_KEY_API_KEY) ?? '',
    baseUrl: localStorage.getItem(LS_KEY_BASE_URL) || DEFAULT_BASE_URL,
    model: localStorage.getItem(LS_KEY_MODEL) || DEFAULT_MODEL,
  };
}

/** Save OpenAI configuration to localStorage. */
export function setOpenAIConfig(config: Partial<OpenAIConfig>): void {
  if (config.apiKey !== undefined) localStorage.setItem(LS_KEY_API_KEY, config.apiKey);
  if (config.baseUrl !== undefined) localStorage.setItem(LS_KEY_BASE_URL, config.baseUrl);
  if (config.model !== undefined) localStorage.setItem(LS_KEY_MODEL, config.model);
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(currentConfig: string): string {
  const keyNames = Object.entries(KEY_LABELS)
    .map(([k, v]) => `${k} = ${v}`)
    .join(', ');

  return `You are a kanata keyboard configuration assistant. You help users create and modify .kbd configuration files for the kanata key remapping tool.

${KANATA_SYNTAX_REFERENCE}

## Available key names
${keyNames}

## Current user configuration
\`\`\`kbd
${currentConfig}
\`\`\`

## Instructions
- When asked to modify the config, output the COMPLETE updated .kbd configuration.
- Wrap your configuration output in a \`\`\`kbd code fence.
- Preserve existing defsrc, defcfg, and layers unless the user asks to change them.
- Keep defsrc and deflayer key counts matched.
- Use defalias for complex actions to keep layers readable.
- Use defvar for repeated numeric values like tap/hold timeouts.
- Prefer tap-hold-release or tap-hold-release-keys over basic tap-hold for home row mods.
- Be concise in your explanations.`;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Send a natural language request to the OpenAI Chat Completions API.
 * Returns the assistant's text response.
 */
export async function sendAssistantRequest(
  prompt: string,
  currentConfig: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(currentConfig) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected API response format');
  }
  return content;
}

/**
 * Extract a kanata config from a markdown-fenced response.
 * Strips ```kbd, ```kanata, or bare ``` fences.
 * Returns the raw config text.
 */
export function extractConfigFromResponse(response: string): string {
  // Try to match fenced code block (```kbd, ```kanata, or ```)
  const fencePattern = /```(?:kbd|kanata)?\s*\n([\s\S]*?)```/;
  const match = response.match(fencePattern);
  if (match) {
    return match[1].trim();
  }
  // No fences found - return the whole response trimmed
  return response.trim();
}

/**
 * Test the API connection with a minimal request.
 * Returns true if the connection succeeds.
 */
export async function testConnection(
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say "ok"' }],
      max_tokens: 5,
    }),
  });

  return response.ok;
}
