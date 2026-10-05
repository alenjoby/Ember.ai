// Ember edge function. Contract: docs/01-API-CONTRACT.md. The server owns every write.
import { type Context, Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import { bodyLimit } from "npm:hono@4/body-limit";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import {
  EMOTIONS,
  removeMedia,
  type ReplyRow,
  supabase,
  type ThoughtRow,
  toReply,
  toThought,
  uploadMedia,
  VARIANTS,
} from "./db.ts";
import { helplineFor } from "./helplines.ts";
import { AiUnavailableError, aiConfigured } from "./llm.ts";
import { moderateImage, moderateText, moderateVoice, VoiceUnclearError } from "./moderation.ts";
import { isRateLimited } from "./rateLimit.ts";
import {
  issueAdminToken,
  randomToken,
  safeEqual,
  sha256Hex,
  verifyAdminPasscode,
  verifyAdminToken,
} from "./security.ts";
import { generateLantern } from "./lantern.ts";
import { scheduleAiReply } from "./aiReply.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Run work after the response is sent (Supabase background tasks). */
function background(label: string, work: Promise<unknown>) {
  const guarded = work.catch((err) => console.error(`[${label}] background task failed:`, err));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(guarded);
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_TEXT = 600;
const MAX_VOICE_BYTES = 2 * 1024 * 1024;
const MAX_VOICE_SECONDS = 60;
const MAX_DRAWING_BYTES = 1.5 * 1024 * 1024;
const VOICE_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};
const STICKERS = new Set([
  "sticker_candle", "sticker_cloud", "sticker_drop", "sticker_flower", "sticker_globe",
  "sticker_hand", "sticker_heart", "sticker_hug", "sticker_leaf", "sticker_moon",
  "sticker_note", "sticker_shell", "sticker_sparkle", "sticker_star", "sticker_sun",
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers ────────────────────────────────────────────────────────

function fail(c: Context, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status as 400);
}

function blocked(c: Context, reason: string, severity: "mild" | "moderate" | "severe") {
  return c.json({ blocked: true, reason, severity }, 422);
}

const tooFast = (c: Context) => fail(c, 429, "rate_limited", "Take a breath, try again in a minute.");

async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function cleanAuthorId(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null;
}

function parseDataUrl(s: unknown): { mime: string; bytes: Uint8Array } | null {
  if (typeof s !== "string") return null;
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)((?:;[^;,]+)*);base64,([A-Za-z0-9+/=\s]+)$/i.exec(s);
  if (!m) return null;
  try {
    return { mime: m[1].toLowerCase(), bytes: decodeBase64(m[3].replace(/\s/g, "")) };
  } catch {
    return null;
  }
}

const isPng = (b: Uint8Array) =>
  b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v);

async function createOwner(itemId: string, kind: "thought" | "reply"): Promise<string> {
  const token = randomToken();
  const { error } = await supabase.from("owners").insert({
    item_id: itemId,
    kind,
    token_hash: await sha256Hex(token),
  });
  if (error) throw new Error(`owner insert failed: ${error.message}`);
  return token;
}

async function canDelete(c: Context, itemId: string, kind: "thought" | "reply"): Promise<boolean> {
  if (await verifyAdminToken(c.req.header("X-Admin-Token"))) return true;
  const token = c.req.header("X-Owner-Token");
  if (!token) return false;
  const { data } = await supabase
    .from("owners")
    .select("token_hash")
    .eq("item_id", itemId)
    .eq("kind", kind)
    .maybeSingle();
  return !!data && safeEqual(await sha256Hex(token), data.token_hash);
}

/** 12 random candidates in ±900 px; keep the one farthest from existing thoughts. */
async function pickPosition(): Promise<{ x: number; y: number }> {
  const { data } = await supabase
    .from("thoughts")
    .select("x, y")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(200);
  const existing = data ?? [];
  let best = { x: 0, y: 0 };
  let bestDist = -1;
  for (let i = 0; i < 12; i++) {
    const cand = { x: Math.round(Math.random() * 1800 - 900), y: Math.round(Math.random() * 1800 - 900) };
    const dist = existing.length
      ? Math.min(...existing.map((p) => Math.hypot(p.x - cand.x, p.y - cand.y)))
      : Infinity;
    if (dist > bestDist) {
      best = cand;
      bestDist = dist;
    }
  }
  return best;
}

// ─── App ────────────────────────────────────────────────────────────

const app = new Hono().basePath("/server");

const allowedOrigins = [
  "http://localhost:5173",
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
];
// Entries may contain "*" for one host label, e.g. https://ember-*-team.vercel.app
const originMatchers = allowedOrigins.map((o) =>
  new RegExp("^" + o.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+") + "$", "i")
);

app.use("*", logger(console.log));
app.use(
  "*",
  cors({
    origin: (origin) => (originMatchers.some((re) => re.test(origin)) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info", "X-Owner-Token", "X-Admin-Token"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);

app.onError((err, c) => {
  console.error("[server] unhandled error:", err);
  return fail(c, 500, "internal", "Something went quiet on our side. Please try again.");
});
app.notFound((c) => fail(c, 404, "not_found", "Nothing here."));

// Health
app.get("/health", (c) => c.json({ ok: true, ai: aiConfigured() ? "up" : "down" }));

// List thoughts (newest 200 visible, replies oldest first)
app.get("/thoughts", async (c) => {
  const { data, error } = await supabase
    .from("thoughts")
    .select("*, replies(*)")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return c.json((data as ThoughtRow[]).map(toThought));
});

// Create a thought
app.post("/thoughts", async (c) => {
  if (await isRateLimited(c.req.raw, "thought")) return tooFast(c);
  const body = await readJson(c);
  if (!body) return fail(c, 400, "bad_request", "That didn't come through right. Try again?");

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 1 || text.length > MAX_TEXT) {
    return fail(c, 400, "invalid_text", `Your thought needs 1 to ${MAX_TEXT} characters.`);
  }
  const emotion = body.emotion ?? null;
  if (emotion !== null && !EMOTIONS.includes(emotion as typeof EMOTIONS[number])) {
    return fail(c, 400, "invalid_emotion", "That feeling tag isn't one we know.");
  }

  const verdict = await moderateText(text);
  if (!verdict.allowed) return blocked(c, verdict.reason, verdict.severity as "mild");

  const pos = await pickPosition();
  const { data: row, error } = await supabase
    .from("thoughts")
    .insert({
      text,
      emotion,
      author_id: cleanAuthorId(body.authorId),
      x: pos.x,
      y: pos.y,
      rotation: Math.round((Math.random() * 10 - 5) * 10) / 10,
      width: 280 + Math.floor(Math.random() * 61),
      variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
      show_help: verdict.isCrisis,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  let ownerToken: string;
  try {
    ownerToken = await createOwner(row.id, "thought");
  } catch (err) {
    await supabase.from("thoughts").delete().eq("id", row.id);
    throw err;
  }

  background("lantern", generateLantern(row.id, text, emotion as string | null));
  background("aiReply", scheduleAiReply(row.id));

  return c.json(
    {
      thought: toThought({ ...row, replies: [] } as ThoughtRow),
      ownerToken,
      ...(verdict.isCrisis ? { helpline: helplineFor(body.country) } : {}),
    },
    201,
  );
});

// Delete a thought (owner or admin)
app.delete("/thoughts/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return fail(c, 404, "not_found", "That thought is already gone.");
  const { data: thought } = await supabase.from("thoughts").select("id").eq("id", id).maybeSingle();
  if (!thought) return fail(c, 404, "not_found", "That thought is already gone.");
  if (!(await canDelete(c, id, "thought"))) return fail(c, 403, "forbidden", "Only the person who released this can remove it.");

  const { data: replies } = await supabase
    .from("replies")
    .select("id, audio_url, drawing_url")
    .eq("thought_id", id);
  const { error } = await supabase.from("thoughts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const replyIds = (replies ?? []).map((r) => r.id);
  await supabase.from("owners").delete().in("item_id", [id, ...replyIds]);
  background("media", removeMedia((replies ?? []).flatMap((r) => [r.audio_url, r.drawing_url])));
  return c.body(null, 204);
});

// Add a reply. Media bodies are base64 JSON: cap the raw body a little above 2 MB * 4/3.
app.post(
  "/thoughts/:id/replies",
  bodyLimit({
    maxSize: 3 * 1024 * 1024,
    onError: (c) => fail(c, 413, "too_large", "That's a bit too long, try a shorter recording."),
  }),
  async (c) => {
    const thoughtId = c.req.param("id");
    if (!UUID_RE.test(thoughtId)) return fail(c, 404, "not_found", "That thought is no longer here.");
    if (await isRateLimited(c.req.raw, "reply")) return tooFast(c);
    const body = await readJson(c);
    if (!body) return fail(c, 400, "bad_request", "That didn't come through right. Try again?");

    const { data: thought } = await supabase
      .from("thoughts")
      .select("id, ai_status, author_id, hidden")
      .eq("id", thoughtId)
      .maybeSingle();
    if (!thought || thought.hidden) return fail(c, 404, "not_found", "That thought is no longer here.");

    const authorId = cleanAuthorId(body.authorId);
    const insert: Partial<ReplyRow> = { thought_id: thoughtId, author_id: authorId, is_ai: false };

    switch (body.type) {
      case "note": {
        const content = typeof body.content === "string" ? body.content.trim() : "";
        if (content.length < 1 || content.length > MAX_TEXT) {
          return fail(c, 400, "invalid_text", `Your reply needs 1 to ${MAX_TEXT} characters.`);
        }
        const verdict = await moderateText(content);
        if (!verdict.allowed) return blocked(c, verdict.reason, verdict.severity as "mild");
        Object.assign(insert, { type: "note", content });
        break;
      }
      case "sticker": {
        if (typeof body.content !== "string" || !STICKERS.has(body.content)) {
          return fail(c, 400, "invalid_sticker", "That sticker isn't one we know.");
        }
        Object.assign(insert, { type: "sticker", content: body.content });
        break;
      }
      case "voice": {
        const media = parseDataUrl(body.audioData);
        if (!media || !VOICE_TYPES[media.mime]) {
          return fail(c, 400, "invalid_audio", "That recording didn't come through. Try again?");
        }
        const duration = Number(body.durationSec);
        if (media.bytes.length > MAX_VOICE_BYTES || !(duration <= MAX_VOICE_SECONDS + 1)) {
          return fail(c, 413, "too_large", "That's a bit too long, try a shorter recording.");
        }
        let verdict;
        try {
          verdict = await moderateVoice(media.bytes, media.mime);
        } catch (err) {
          if (err instanceof AiUnavailableError) {
            return fail(c, 503, "ai_unavailable", "Voice replies are resting right now. Try a note?");
          }
          if (err instanceof VoiceUnclearError) {
            return blocked(c, "Couldn't hear that clearly, try again.", "mild");
          }
          throw err;
        }
        if (!verdict.allowed) return blocked(c, verdict.reason, verdict.severity as "mild");
        const audioUrl = await uploadMedia(
          `voice/${crypto.randomUUID()}.${VOICE_TYPES[media.mime]}`,
          media.bytes,
          media.mime,
        );
        Object.assign(insert, { type: "voice", content: verdict.transcript, audio_url: audioUrl });
        break;
      }
      case "drawing": {
        const media = parseDataUrl(body.drawingData);
        if (!media || media.mime !== "image/png" || !isPng(media.bytes)) {
          return fail(c, 400, "invalid_drawing", "That drawing didn't come through. Try again?");
        }
        if (media.bytes.length > MAX_DRAWING_BYTES) {
          return fail(c, 413, "too_large", "That drawing is a bit too big. Try a simpler one?");
        }
        const verdict = await moderateImage(media.bytes);
        if (!verdict.allowed) return blocked(c, verdict.reason, "moderate");
        const drawingUrl = await uploadMedia(`drawing/${crypto.randomUUID()}.png`, media.bytes, "image/png");
        Object.assign(insert, { type: "drawing", content: "", drawing_url: drawingUrl });
        break;
      }
      default:
        return fail(c, 400, "invalid_type", "Replies can be a note, voice, drawing or sticker.");
    }

    const { data: row, error } = await supabase.from("replies").insert(insert).select("*").single();
    if (error) {
      await removeMedia([insert.audio_url, insert.drawing_url]);
      throw new Error(error.message);
    }

    let ownerToken: string;
    try {
      ownerToken = await createOwner(row.id, "reply");
    } catch (err) {
      await supabase.from("replies").delete().eq("id", row.id);
      await removeMedia([row.audio_url, row.drawing_url]);
      throw err;
    }

    // A human (other than the author) answered: Ember stays quiet.
    if (thought.ai_status === "waiting" && (!authorId || authorId !== thought.author_id)) {
      await supabase.from("thoughts").update({ ai_status: "skipped" }).eq("id", thoughtId).eq("ai_status", "waiting");
    }

    return c.json({ reply: toReply(row as ReplyRow), ownerToken }, 201);
  },
);

// Delete a reply (owner or admin)
app.delete("/thoughts/:id/replies/:replyId", async (c) => {
  const thoughtId = c.req.param("id");
  const replyId = c.req.param("replyId");
  if (!UUID_RE.test(thoughtId) || !UUID_RE.test(replyId)) {
    return fail(c, 404, "not_found", "That reply is already gone.");
  }
  const { data: reply } = await supabase
    .from("replies")
    .select("id, audio_url, drawing_url")
    .eq("id", replyId)
    .eq("thought_id", thoughtId)
    .maybeSingle();
  if (!reply) return fail(c, 404, "not_found", "That reply is already gone.");
  if (!(await canDelete(c, replyId, "reply"))) return fail(c, 403, "forbidden", "Only the person who sent this can remove it.");

  const { error } = await supabase.from("replies").delete().eq("id", replyId);
  if (error) throw new Error(error.message);
  await supabase.from("owners").delete().eq("item_id", replyId);
  background("media", removeMedia([reply.audio_url, reply.drawing_url]));
  return c.body(null, 204);
});

// Optional live pre-check while typing. The final decision is always on POST.
app.post("/moderate", async (c) => {
  if (await isRateLimited(c.req.raw, "moderate")) return tooFast(c);
  const body = await readJson(c);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ allowed: true, severity: "clean", reason: "", isCrisis: false });
  if (text.length > MAX_TEXT) return fail(c, 400, "invalid_text", `Keep it under ${MAX_TEXT} characters.`);
  return c.json(await moderateText(text));
});

// Helpline for the viewer's country
app.get("/helpline", (c) => c.json(helplineFor(c.req.query("country"))));

// Admin: exchange the passcode for a short-lived token (sent as X-Admin-Token on deletes)
app.post("/verify-admin", async (c) => {
  if (await isRateLimited(c.req.raw, "admin")) return tooFast(c);
  const body = await readJson(c);
  if (!verifyAdminPasscode(body?.passcode)) {
    return c.json({ success: false, error: { code: "forbidden", message: "Incorrect passcode." } }, 401);
  }
  return c.json({ success: true, adminToken: await issueAdminToken() });
});

Deno.serve(app.fetch);
