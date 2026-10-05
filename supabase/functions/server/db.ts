// Database access (service role) + row → API shape mappers.
// API shapes mirror docs/01-API-CONTRACT.md exactly.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

export const MEDIA_BUCKET = "ember-media";

export const EMOTIONS = ["lonely", "grateful", "anxious", "hopeful", "grieving", "joyful"] as const;
export type Emotion = typeof EMOTIONS[number];
export type ReplyType = "note" | "voice" | "drawing" | "sticker";
export type AiStatus = "waiting" | "replying" | "done" | "skipped";
export type Variant = "warm" | "light" | "teal" | "rose";
export const VARIANTS: Variant[] = ["warm", "light", "teal", "rose"];

export interface Lantern {
  palette: [string, string, string];
  glow: number;
  flicker: number;
  shape: "round" | "tall" | "paper" | "star";
  sound: {
    mood: "rain" | "wind" | "ocean" | "fire" | "night" | "birds" | "chimes";
    instrument: "pad" | "piano" | "cello" | "flute" | "bells";
    key: string;
    tempo: number;
  };
  caption: string;
}

export interface ThoughtResponse {
  id: string;
  type: ReplyType;
  content: string;
  timestamp: string;
  isAI: boolean;
  drawingData?: string;
  audioUrl?: string;
  authorId?: string;
}

export interface Thought {
  id: string;
  text: string;
  timestamp: string;
  rotation: number;
  x: number;
  y: number;
  width: number;
  variant: Variant;
  emotion?: Emotion;
  authorId?: string;
  responses: ThoughtResponse[];
  aiStatus: AiStatus;
  lantern: Lantern | null;
  showHelp: boolean;
  isExample: boolean;
}

export interface ThoughtRow {
  id: string;
  text: string;
  emotion: string | null;
  author_id: string | null;
  x: number;
  y: number;
  rotation: number;
  width: number;
  variant: Variant;
  ai_status: AiStatus;
  lantern: Lantern | null;
  show_help: boolean;
  is_example: boolean;
  hidden: boolean;
  created_at: string;
  replies?: ReplyRow[];
}

export interface ReplyRow {
  id: string;
  thought_id: string;
  type: ReplyType;
  content: string;
  audio_url: string | null;
  drawing_url: string | null;
  is_ai: boolean;
  author_id: string | null;
  created_at: string;
}

const iso = (ts: string) => new Date(ts).toISOString();

export function toReply(r: ReplyRow): ThoughtResponse {
  const out: ThoughtResponse = {
    id: r.id,
    type: r.type,
    content: r.content,
    timestamp: iso(r.created_at),
    isAI: r.is_ai,
  };
  if (r.drawing_url) out.drawingData = r.drawing_url;
  if (r.audio_url) out.audioUrl = r.audio_url;
  if (r.author_id) out.authorId = r.author_id;
  return out;
}

export function toThought(t: ThoughtRow): Thought {
  const replies = [...(t.replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const out: Thought = {
    id: t.id,
    text: t.text,
    timestamp: iso(t.created_at),
    rotation: t.rotation,
    x: t.x,
    y: t.y,
    width: t.width,
    variant: t.variant,
    responses: replies.map(toReply),
    aiStatus: t.ai_status,
    lantern: t.lantern ?? null,
    showHelp: t.show_help,
    isExample: t.is_example,
  };
  if (t.emotion) out.emotion = t.emotion as Emotion;
  if (t.author_id) out.authorId = t.author_id;
  return out;
}

/** Upload bytes to the public media bucket; returns the public URL. */
export async function uploadMedia(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of media files referenced by public URLs. */
export async function removeMedia(urls: (string | null | undefined)[]): Promise<void> {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const paths = urls
    .filter((u): u is string => !!u && u.includes(marker))
    .map((u) => u.split(marker)[1]);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.warn("[media] remove failed:", error.message);
}

const MIN_GAP = 260; // keep cards from overlapping

type Point = { x: number; y: number };
const nearest = (p: Point, others: Point[]) =>
  others.length ? Math.min(...others.map((o) => Math.hypot(o.x - p.x, o.y - p.y))) : Infinity;

/**
 * Place a new thought. With an emotion that already has thoughts: near a same-emotion
 * thought (260–420 px away) so moods form small constellations for the connection threads.
 * Otherwise (or if that area is full): 12 random candidates in ±900 px, farthest from all.
 */
export async function pickPosition(emotion?: string | null): Promise<Point> {
  const { data } = await supabase
    .from("thoughts")
    .select("x, y, emotion")
    .eq("hidden", false)
    .or(liveFilter())
    .order("created_at", { ascending: false })
    .limit(200);
  const existing = data ?? [];

  const peers = emotion ? existing.filter((t) => t.emotion === emotion).slice(0, 8) : [];
  if (peers.length) {
    let best: Point | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < 24; i++) {
      const anchor = peers[Math.floor(Math.random() * peers.length)];
      const angle = Math.random() * Math.PI * 2;
      const r = 260 + Math.random() * 160;
      const cand = {
        x: Math.round(Math.max(-1400, Math.min(1400, anchor.x + Math.cos(angle) * r))),
        y: Math.round(Math.max(-1400, Math.min(1400, anchor.y + Math.sin(angle) * r))),
      };
      if (nearest(cand, existing) < MIN_GAP) continue;
      const score = nearest(cand, peers); // closer to its own mood is better
      if (score < bestScore) {
        best = cand;
        bestScore = score;
      }
    }
    if (best) return best;
  }

  let best: Point = { x: 0, y: 0 };
  let bestDist = -1;
  for (let i = 0; i < 12; i++) {
    const cand = { x: Math.round(Math.random() * 1800 - 900), y: Math.round(Math.random() * 1800 - 900) };
    const dist = nearest(cand, existing);
    if (dist > bestDist) {
      best = cand;
      bestDist = dist;
    }
  }
  return best;
}

/** Lanterns fade from the canvas after THOUGHT_TTL_HOURS (default 24). Examples never fade. */
export function liveFilter(): string {
  const hours = Number(Deno.env.get("THOUGHT_TTL_HOURS") ?? 24);
  const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();
  return `is_example.eq.true,created_at.gte."${cutoff}"`;
}
