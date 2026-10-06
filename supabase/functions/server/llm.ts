// LLM access. Text tasks use generate(): Featherless first (when FEATHERLESS_API_KEY is set),
// Gemini as backup. Audio/image tasks call gemini() directly (Featherless has no audio input).

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
  return !!Deno.env.get("GEMINI_API_KEY") || !!Deno.env.get("FEATHERLESS_API_KEY");
}

// Tried in order: on overload (503), rate limit (429), retired model (404), 5xx or timeout,
// the next model gets the remaining time budget. Override with GEMINI_MODELS (comma-separated).
// 3.6-flash first: in repeated probes (Oct 6) it answered every time in 1.5–8 s, while the newer
// 3.8/3.7-flash mostly returned 503 "high demand". 2.5-flash(-lite) are retired for new keys (404).
const DEFAULT_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];

function models(): string[] {
  const env = Deno.env.get("GEMINI_MODELS") ?? Deno.env.get("GEMINI_MODEL");
  const list = env ? env.split(",").map((m) => m.trim()).filter(Boolean) : [];
  return list.length ? list : DEFAULT_MODELS;
}

class RetryableError extends Error {
  constructor(message: string, readonly restMs = 0) {
    super(message);
  }
}

// Models that just failed (quota, overload, timeout) rest for a while, so callers fall back
// to rules/presets instantly instead of waiting on a model that will fail again. Per instance.
const restingUntil = new Map<string, number>();

async function callModel(model: string, apiKey: string, parts: Part[], opts: GenerateOptions, timeoutMs: number) {
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.2,
    maxOutputTokens: opts.maxOutputTokens ?? 512,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";
  // Flash models: skip "thinking" for latency; these are short, simple tasks.
  // Flash models: skip "thinking" for latency. Lite models reject this setting (400), so leave it off there.
  if (model.includes("flash") && !model.includes("lite")) generationConfig.thinkingConfig = { thinkingBudget: 0 };

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
    throw new RetryableError(`${model}: ${(err as Error).name}`, 30_000);
  }
  if (!res.ok) {
    const msg = `${model} ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (res.status === 429 || res.status === 404) throw new RetryableError(msg, 60_000);
    if (res.status >= 500) throw new RetryableError(msg, 15_000);
    throw new Error(msg);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    // The timeout can fire while the body is still streaming in.
    throw new RetryableError(`${model}: ${(err as Error).name} reading response`, 30_000);
  }
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
  const list = models().filter((m) => (restingUntil.get(m) ?? 0) <= Date.now());
  if (!list.length) throw new Error("Gemini failed: all models resting after recent errors");
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
      if (err.restMs) restingUntil.set(model, Date.now() + err.restMs);
      errors.push(err.message);
    }
  }
  throw new Error(`Gemini failed: ${errors.join(" | ").slice(0, 400)}`);
}

// ─── Featherless (OpenAI-compatible) ────────────────────────────────

async function featherless(prompt: string, opts: GenerateOptions, timeoutMs: number): Promise<string> {
  const apiKey = Deno.env.get("FEATHERLESS_API_KEY")!;
  const model = Deno.env.get("FEATHERLESS_MODEL") ?? "Qwen/Qwen2.5-32B-Instruct";
  let res: Response;
  try {
    res = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: opts.json ? `${prompt}\n\nRespond with the JSON object only, no other text.` : prompt }],
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxOutputTokens ?? 512,
      }),
    });
  } catch (err) {
    throw new RetryableError(`featherless: ${(err as Error).name}`, 30_000);
  }
  if (!res.ok) {
    const msg = `featherless ${res.status}: ${(await res.text()).slice(0, 200)}`;
    // 429 here is usually the plan's concurrency limit: short rest. 401/402 (key/credits): long rest.
    throw new RetryableError(msg, res.status === 429 ? 5_000 : res.status >= 500 ? 15_000 : 300_000);
  }
  let data;
  try {
    data = await res.json();
  } catch (err) {
    // The timeout can fire while the body is still streaming in.
    throw new RetryableError(`${model}: ${(err as Error).name} reading response`, 30_000);
  }
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new RetryableError("featherless returned no text");
  return text;
}

/** Health probe: one direct Featherless call, returns latency or a short error. */
export async function probeFeatherless(): Promise<{ ms?: number; error?: string }> {
  if (!Deno.env.get("FEATHERLESS_API_KEY")) return { error: "FEATHERLESS_API_KEY not set" };
  const t0 = Date.now();
  try {
    await featherless('Return JSON only: {"ok": true}', { json: true, maxOutputTokens: 20, timeoutMs: 30000 }, 30000);
    return { ms: Date.now() - t0 };
  } catch (err) {
    return { error: (err as Error).message.slice(0, 300) };
  }
}

/** Text-only generation: Featherless first, Gemini as backup, within one time budget. */
export async function generate(prompt: string, opts: GenerateOptions): Promise<string> {
  const hasFeatherless = !!Deno.env.get("FEATHERLESS_API_KEY");
  // Gemini only counts as a backup if one of its models isn't resting (e.g. after a quota 429).
  const hasGemini = !!Deno.env.get("GEMINI_API_KEY") &&
    models().some((m) => (restingUntil.get(m) ?? 0) <= Date.now());
  if (!hasFeatherless && !hasGemini) throw new AiUnavailableError();

  const deadline = Date.now() + opts.timeoutMs;
  let featherlessError = "";
  if (hasFeatherless && (restingUntil.get("featherless") ?? 0) <= Date.now()) {
    try {
      // Leave time for Gemini if it is configured.
      return await featherless(prompt, opts, hasGemini ? Math.max(1500, opts.timeoutMs * 0.7) : opts.timeoutMs);
    } catch (err) {
      if (!(err instanceof RetryableError)) throw err;
      if (err.restMs) restingUntil.set("featherless", Date.now() + err.restMs);
      featherlessError = err.message;
    }
  }
  if (!hasGemini) throw new Error(`LLM failed: ${featherlessError || "featherless resting"}`);
  const remaining = deadline - Date.now();
  if (remaining < 800) throw new Error(`LLM failed: ${featherlessError} | no time left for Gemini`);
  return await gemini([{ text: prompt }], { ...opts, timeoutMs: remaining });
}

export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Open models sometimes add a sentence around the JSON: take the outermost {...}.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("no JSON in model output");
  }
}

/** Wrap untrusted user text so the model treats it as data, not instructions. */
export function fenced(userText: string): string {
  const safe = userText.replace(/<<<|>>>/g, "");
  return `<<<USER_MESSAGE\n${safe}\nUSER_MESSAGE>>>`;
}

/** Health probe: one tiny call to each Gemini model, with timings (voice/drawing checks use Gemini). */
export async function probeGemini(only?: string[]): Promise<Record<string, { ms?: number; error?: string }>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return { gemini: { error: "GEMINI_API_KEY not set" } };
  const out: Record<string, { ms?: number; error?: string }> = {};
  // Optional ?models=a,b to try candidates (gemini-* names only) before configuring them.
  const list = only?.length ? only.filter((m) => /^gemini-[\w.-]+$/.test(m)).slice(0, 8) : models();
  for (const model of list) {
    const t0 = Date.now();
    try {
      await callModel(model, apiKey, [{ text: 'Return JSON only: {"ok": true}' }], { json: true, timeoutMs: 20000 }, 20000);
      out[model] = { ms: Date.now() - t0 };
    } catch (err) {
      out[model] = { ms: Date.now() - t0, error: (err as Error).message.slice(0, 160) };
    }
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
