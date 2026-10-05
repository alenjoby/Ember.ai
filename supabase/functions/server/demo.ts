// DEMO MODE (for the demo video only). Simulated people reply to new thoughts and the
// frontend adds a few dummy people to the online count. Autopilot: a simulated person
// releases a new thought every DEMO_POST_EVERY_SEC while the app is open.
// Off unless DEMO_MODE=true. Simulated content uses authorId "demo_<name>".
import { pickPosition, supabase, VARIANTS } from "./db.ts";
import { generateLantern } from "./lantern.ts";
import { scheduleAiReply } from "./aiReply.ts";

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

const THOUGHTS: { text: string; emotion: string }[] = [
  { text: "first week at the new job and I feel invisible", emotion: "lonely" },
  { text: "everyone in my hostel went home for the holidays. the corridor is so quiet", emotion: "lonely" },
  { text: "I talk to people all day and still feel like nobody really knows me", emotion: "lonely" },
  { text: "ate dinner alone again, put a video on just to hear voices", emotion: "lonely" },
  { text: "exam results come out tomorrow and my hands won't stop shaking", emotion: "anxious" },
  { text: "my heart races every time my phone buzzes", emotion: "anxious" },
  { text: "interview in 3 hours. rehearsed my answers 40 times", emotion: "anxious" },
  { text: "can't sleep, my brain keeps replaying one awkward thing I said in 2019", emotion: "anxious" },
  { text: "my grandmother passed last week and her kitchen still smells like cardamom", emotion: "grieving" },
  { text: "it's been a year since my dog died and I still look for him at the door", emotion: "grieving" },
  { text: "found an old voicemail from my dad. listened to it six times", emotion: "grieving" },
  { text: "my best friend moved abroad and the city feels emptier now", emotion: "grieving" },
  { text: "started therapy today. scared but it feels like a door opening", emotion: "hopeful" },
  { text: "planted tomatoes on my balcony. first small green leaf this morning", emotion: "hopeful" },
  { text: "three weeks sober. one day at a time", emotion: "hopeful" },
  { text: "applied for my dream course. whatever happens, I tried", emotion: "hopeful" },
  { text: "I GOT THE SCHOLARSHIP!! I'm crying in the library", emotion: "joyful" },
  { text: "my little sister said her first full sentence today", emotion: "joyful" },
  { text: "danced in the kitchen to an old song and felt 15 again", emotion: "joyful" },
  { text: "the rain finally came and the whole street smells like earth", emotion: "joyful" },
  { text: "a stranger paid for my chai today. small thing, made my whole week", emotion: "grateful" },
  { text: "my mom called just to ask if I ate. I didn't know I needed that", emotion: "grateful" },
  { text: "grateful for the friend who sat with me in silence and didn't try to fix it", emotion: "grateful" },
  { text: "my teacher remembered my name after 5 years", emotion: "grateful" },
];

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Background task: 1–2 simulated replies at ~2–9 s, before Ember's AI reply.
 * They do not change ai_status, so the AI reply still shows in the demo. Never throws.
 */
export async function scheduleDemoReplies(thoughtId: string, emotion: string | null): Promise<void> {
  const key = emotion && NOTES[emotion] ? emotion : "default";
  const people = [...PEOPLE].sort(() => Math.random() - 0.5);
  const delays = Math.random() < 0.6 ? [2000 + Math.random() * 2000, 5500 + Math.random() * 3500] : [3000 + Math.random() * 4000];
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

// ─── Autopilot ──────────────────────────────────────────────────────

let lastAutopilotCheck = 0;

/**
 * Called on every GET /thoughts (the frontend polls every 10 s). Releases one simulated
 * thought if the newest one is older than DEMO_POST_EVERY_SEC. Never throws.
 */
export async function demoAutopilotTick(): Promise<void> {
  if (!demoEnabled()) return;
  const everyMs = Number(Deno.env.get("DEMO_POST_EVERY_SEC") ?? 30) * 1000;
  const now = Date.now();
  if (now - lastAutopilotCheck < 5000) return; // per-instance debounce
  lastAutopilotCheck = now;

  const { data: recent, error } = await supabase
    .from("thoughts")
    .select("text, created_at")
    .like("author_id", "demo_%")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return console.warn("[demo] autopilot read failed:", error.message);
  if (recent.length && now - new Date(recent[0].created_at).getTime() < everyMs) return;
  if (recent.length >= Number(Deno.env.get("DEMO_MAX_THOUGHTS") ?? 40)) return;

  const used = new Set(recent.map((r) => r.text));
  const fresh = THOUGHTS.filter((t) => !used.has(t.text));
  const { text, emotion } = pick(fresh.length ? fresh : THOUGHTS);
  const pos = await pickPosition(emotion);

  const { data: row, error: insErr } = await supabase
    .from("thoughts")
    .insert({
      text,
      emotion,
      author_id: `demo_${pick(PEOPLE)}`,
      x: pos.x,
      y: pos.y,
      rotation: Math.round((Math.random() * 10 - 5) * 10) / 10,
      width: 280 + Math.floor(Math.random() * 61),
      variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
    })
    .select("id")
    .single();
  if (insErr) return console.warn("[demo] autopilot insert failed:", insErr.message);

  await Promise.all([
    generateLantern(row.id, text, emotion),
    scheduleDemoReplies(row.id, emotion),
    scheduleAiReply(row.id),
  ]);
}
