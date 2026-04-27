import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

// Cache the client across HMR reloads in dev — same pattern as lib/db/client.ts.
const globalForAnthropic = globalThis as unknown as {
  anthropic?: Anthropic;
};

export const anthropicClient: Anthropic =
  globalForAnthropic.anthropic ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

if (env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropicClient;
}

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

/**
 * Retry transient failures (5xx, 429) with exponential backoff. Non-transient
 * errors (4xx other than 429, validation, invalid API key) propagate.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      const isTransient = isTransientAnthropicError(err);
      if (!isTransient || attempt >= maxAttempts) throw err;
      // Honor server-supplied Retry-After when present (Anthropic returns it
      // on 429); otherwise fall back to exponential backoff.
      const serverDelay = parseRetryAfterMs(err);
      const delay = serverDelay ?? baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function parseRetryAfterMs(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const headers = (err as { headers?: Record<string, string | undefined> }).headers;
  const raw = headers?.["retry-after"];
  if (!raw) return null;
  // Format 1: integer seconds.
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds * 1000);
  // Format 2: HTTP-date.
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function isTransientAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; name?: string };
  if (e.status === 429) return true;
  if (typeof e.status === "number" && e.status >= 500 && e.status < 600) return true;
  if (e.name === "APIConnectionError" || e.name === "APIConnectionTimeoutError") return true;
  return false;
}
