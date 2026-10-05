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
