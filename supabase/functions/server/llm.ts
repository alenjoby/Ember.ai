// LLM access. Gemini only for now; keep calls behind these helpers so an
// OpenAI-compatible provider (Featherless) can be added via LLM_PROVIDER later.

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

export async function gemini(parts: Part[], opts: GenerateOptions): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new AiUnavailableError();
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.2,
    maxOutputTokens: opts.maxOutputTokens ?? 512,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";
  // Flash models: skip "thinking" for latency; these are short, simple tasks.
  if (model.includes("flash")) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(opts.timeoutMs),
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error(`Gemini returned no text (finish: ${data.candidates?.[0]?.finishReason})`);
  return text;
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
