// DEMO MODE (for the demo video only). Simulated people reply to new thoughts and the
// frontend adds a few dummy people to the online count. Off unless DEMO_MODE=true.
// Simulated replies use authorId "demo_<name>" so the UI can tell them apart.
import { supabase } from "./db.ts";

export function demoEnabled(): boolean {
  return Deno.env.get("DEMO_MODE") === "true";
}

/** Dummy online count: changes slowly (every 5 min) so every viewer sees about the same number. */
export function demoOnline(): number {
  const base = Number(Deno.env.get("DEMO_ONLINE") ?? 8);
  const bucket = Math.floor(Date.now() / 300_000);
  return Math.max(1, base + (bucket % 7) - 3);
}

const PEOPLE = ["mira", "kabir", "ash", "noor", "theo", "lena", "sam", "ira", "jun", "rhea"];

const NOTES: Record<string, string[]> = {
  lonely: [
    "sitting here with you for a bit. the quiet feels smaller with two people in it.",
    "been there this month too. you're not talking into nothing, someone read this.",
    "sending you a small light from my side of the city tonight.",
  ],
  anxious: [
    "slow breath in, slower breath out. you got through every hard day so far.",
    "my chest does that too sometimes. it passes, even when it doesn't feel like it will.",
    "one small thing at a time. you don't have to solve all of it tonight.",
  ],
  grieving: [
    "missing someone is love with nowhere to go. holding a little of it with you.",
    "no right way to grieve. go gently with yourself today.",
    "they were lucky to be remembered like this.",
  ],
  hopeful: [
    "holding onto this with you. tomorrow feels a little lighter already.",
    "love this. keep that feeling close.",
    "this made me smile. here's to the good thing coming.",
  ],
  joyful: [
    "this is the best thing I've read all day!",
    "yesss, so happy for you. enjoy every bit of it.",
    "your joy just reached me through a screen. thank you.",
  ],
  grateful: [
    "this is so lovely. thank you for reminding me to notice the small things.",
    "gratitude looks good on you.",
    "saving this one for a hard day.",
  ],
  default: [
    "read this twice. thank you for letting it out here.",
    "you put it into words, that's not small. sending warmth.",
    "this landed softly with me. hope tonight is gentle to you.",
  ],
};

const STICKERS: Record<string, string[]> = {
  lonely: ["sticker_hug", "sticker_candle", "sticker_moon"],
  anxious: ["sticker_leaf", "sticker_cloud", "sticker_hand"],
  grieving: ["sticker_candle", "sticker_drop", "sticker_heart"],
  hopeful: ["sticker_sun", "sticker_sparkle", "sticker_star"],
  joyful: ["sticker_sparkle", "sticker_sun", "sticker_flower"],
  grateful: ["sticker_flower", "sticker_heart", "sticker_leaf"],
  default: ["sticker_heart", "sticker_hug", "sticker_candle"],
};

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Background task: 1–2 simulated replies, both before Ember's AI reply (20 s).
 * They do not change ai_status, so the AI reply still shows in the demo. Never throws.
 */
export async function scheduleDemoReplies(thoughtId: string, emotion: string | null): Promise<void> {
  const key = emotion && NOTES[emotion] ? emotion : "default";
  const people = [...PEOPLE].sort(() => Math.random() - 0.5);
  const delays = Math.random() < 0.6 ? [5000 + Math.random() * 4000, 12000 + Math.random() * 6000] : [6000 + Math.random() * 6000];
  const notes = [...NOTES[key]].sort(() => Math.random() - 0.5);

  let elapsed = 0;
  for (const [i, at] of delays.entries()) {
    await sleep(at - elapsed);
    elapsed = at;
    const asSticker = Math.random() < 0.3;
    const { error } = await supabase.from("replies").insert({
      thought_id: thoughtId,
      type: asSticker ? "sticker" : "note",
      content: asSticker ? pick(STICKERS[key]) : notes[i],
      is_ai: false,
      author_id: `demo_${people[i]}`,
    });
    if (error) return console.warn("[demo] reply insert failed (thought deleted?):", error.message);
  }
}
