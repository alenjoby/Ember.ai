// LLM access (Gemini). All model calls go through these helpers.

export class AiUnavailableError extends Error {
  constructor(message = "AI key not configured") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface GenerateOptions {
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs: number;
}

export function aiConfigured(): boolean {
  return !!Deno.env.get("GEMINI_API_KEY");
}

// Tried in order: on overload (503), rate limit (429), retired model (404), 5xx or timeout,
// the next model gets the remaining time budget. Override with GEMINI_MODELS (comma-separated).
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash"];

function models(): string[] {
  const env = Deno.env.get("GEMINI_MODELS") ?? Deno.env.get("GEMINI_MODEL");
  const list = env ? env.split(",").map((m) => m.trim()).filter(Boolean) : [];
  return list.length ? list : DEFAULT_MODELS;
}

class RetryableError extends Error {}

async function callModel(model: string, apiKey: string, parts: Part[], opts: GenerateOptions, timeoutMs: number) {
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.2,
    maxOutputTokens: opts.maxOutputTokens ?? 512,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";
  // Flash models: skip "thinking" for latency; these are short, simple tasks.
  if (model.includes("flash")) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
      },
    );
  } catch (err) {
    throw new RetryableError(`${model}: ${(err as Error).name}`);
  }
  if (!res.ok) {
    const msg = `${model} ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if ([404, 429].includes(res.status) || res.status >= 500) throw new RetryableError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new RetryableError(`${model} returned no text (finish: ${data.candidates?.[0]?.finishReason})`);
  return text;
}

export async function gemini(parts: Part[], opts: GenerateOptions): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AiUnavailableError();
  const list = models();
  const deadline = Date.now() + opts.timeoutMs;
  const errors: string[] = [];
  for (const [i, model] of list.entries()) {
    const remaining = deadline - Date.now();
    if (remaining < 800) break;
    // Earlier models get 60% of what's left so a hung call still leaves time for a backup.
    const budget = i < list.length - 1 ? Math.max(800, remaining * 0.6) : remaining;
    try {
      return await callModel(model, apiKey, parts, opts, budget);
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err;
      errors.push(err.message);
    }
  }
  throw new Error(`Gemini failed: ${errors.join(" | ").slice(0, 400)}`);
}

export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

/** Wrap untrusted user text so the model treats it as data, not instructions. */
export function fenced(userText: string): string {
  const safe = userText.replace(/<<<|>>>/g, "");
  return `<<<USER_MESSAGE\n${safe}\nUSER_MESSAGE>>>`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
