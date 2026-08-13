const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }
  return apiKey;
}

function getHeaders(contentType = false): HeadersInit {
  return {
    "x-api-key": getApiKey(),
    "anthropic-version": ANTHROPIC_VERSION,
    ...(contentType ? { "content-type": "application/json" } : {}),
  };
}

/**
 * Validates the server-side credential without exposing it to the browser.
 * This lightweight request is safe to use in deployment health checks.
 */
export async function validateDirectAnthropicCredential(): Promise<void> {
  const response = await fetch(`${ANTHROPIC_API_BASE}/models?limit=1`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Anthropic credential validation failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(body.data)) {
    throw new Error("Anthropic credential validation returned an unexpected response");
  }
}

/**
 * Server-only wrapper for future HelixBid Claude features.
 * Never import this module into client code.
 */
export async function requestDirectAnthropic<T extends Record<string, unknown>>(
  payload: T
): Promise<Response> {
  return fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
}
