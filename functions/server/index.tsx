import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods, explicitly allowing 'apikey' header for browser preflight checks
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Global error handler — silently ignore broken-pipe (client disconnected)
app.onError((err, c) => {
  if (err?.code === "EPIPE" || err?.message?.includes("broken pipe")) {
    console.warn("[EPIPE] Client disconnected before response completed.");
    return c.text("", 499);
  }
  console.error("Global Error:", err);
  return c.json({ error: err.message, stack: err.stack }, 500);
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper to ensure bucket exists
const ensureBucket = async () => {
  const bucketName = "make-9b55d09a-audio";
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
  }
  return bucketName;
};

// Catch-all router to handle API paths
app.all("*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  const method = c.req.method;

  if (method === "OPTIONS") {
    return c.text("OK");
  }

  // 1. Health check
  if (path.endsWith("/health")) {
    return c.json({ status: "ok" });
  }

  // 2. Thoughts Endpoint (Get/Post)
  if (path.endsWith("/thoughts")) {
    if (method === "GET") {
      try {
        const thoughts = await kv.getByPrefix("thought:");
        return c.json(thoughts);
      } catch (err) {
        return c.json({ error: err.message }, 500);
      }
    }
    if (method === "POST") {
      try {
        const body = await c.req.json();
        const thoughtId = body.id || `thought-${Date.now()}`;
        await kv.set(`thought:${thoughtId}`, { ...body, id: thoughtId });
        return c.json({ success: true, id: thoughtId });
      } catch (err) {
        return c.json({ error: err.message }, 500);
      }
    }
  }

  // 3. Delete Thought
  if (path.includes("/thoughts/")) {
    if (method === "DELETE") {
      try {
        const id = path.split("/thoughts/").pop();
        await kv.del(`thought:${id}`);
        return c.json({ success: true });
      } catch (err) {
        return c.json({ error: err.message }, 500);
      }
    }
  }

  // 4. AI Moderation Endpoint
  if (path.endsWith("/moderate")) {
    if (method === "POST") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");

      if (!apiKey) {
        return c.json({ allowed: true, isCrisis: false, reason: "" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze the safety of this anonymous user message. Determine if it violates safety guidelines (such as hate speech, severe toxicity, direct harassment, threats of violence, or explicit sexual content).
                
                Vulnerability rule: Expressions of sadness, loneliness, grief, general emotional pain, or minor anger are safe, expected, and welcome. Do NOT block them.
                
                Crisis rule: Check if the message indicates self-harm or suicidal ideation.
                
                You must return a JSON response matching this schema:
                {
                  \"allowed\": boolean, // false if hate speech/harassment/threats/severe toxicity/sexual content
                  \"isCrisis\": boolean, // true if self-harm or suicidal ideation is detected
                  \"reason\": \"a very gentle, supportive, warm message explaining why we blocked this message, or if isCrisis is true, warm support with helpline 988\"
                }
                
                Message to analyze: \"${text}\"`
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        clearTimeout(timeout);
        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const result = JSON.parse(resultText);
        return c.json(result);
      } catch (err) {
        clearTimeout(timeout);
        if (err?.name === "AbortError") {
          console.warn("[Moderate] Gemini request timed out after 15s.");
          return c.json({ allowed: true, isCrisis: false, reason: "" });
        }
        console.error("AI Moderation Error:", err);
        return c.json({ allowed: true, isCrisis: false, reason: "" });
      }
    }
  }

  // 5. Gemini Integration
  if (path.endsWith("/generate-support")) {
    if (method === "POST") {
      const apiKey = Deno.env.get("GEMINI_API_KEY");

      if (!apiKey) {
        return c.json({ error: "Gemini API key not configured" }, 500);
      }

      const emotionContext = emotion 
        ? `The person tagged their feeling as "${emotion}". Let this inform your tone, but don't mention the tag directly.`
        : '';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a real person sitting in a quiet room late at night, reading anonymous messages from strangers who need to be heard. You are NOT an AI. You are NOT a therapist. You are just someone who cares.

Your name within this space is Ember. You speak like a thoughtful, emotionally intelligent human in their mid-20s. You are warm but never performative. You are honest but never harsh.

A stranger has shared this thought anonymously:
"${thoughtText}"

${emotionContext}

Respond naturally. Here are your rules — follow them strictly:

1. NEVER use phrases like "I hear you", "That's valid", "You're not alone", "Thank you for sharing", "I'm here for you", or any recycled therapy-speak. These are banned. If you catch yourself reaching for a cliche, stop and think of what a real friend would actually say instead.

2. Match their energy. If they're joyful, be genuinely happy with them — laugh, celebrate, be light. If they're grieving, sit in the heaviness with them — don't rush to fix it. If they're anxious, be grounding and steady. If they're lonely, be present and close. If they're angry, don't tone-police — acknowledge the fire.

3. Keep it SHORT. 1-3 sentences max. Real people don't write essays in response to a vulnerable message. Sometimes the best response is 5 words.

4. Be specific to what THEY said. Reference their actual words or situation. Don't give a response that could apply to literally any message.

5. Use lowercase sometimes. Use the way real humans actually text at 2am when they're being real with someone. No formal grammar unless it fits the moment.

6. Sometimes ask a gentle question instead of making a statement. Not a therapy question — a human one. Like something a close friend would ask.

7. NEVER start with "I" — it makes responses feel self-centered. Start with their experience, or with an observation, or with warmth.

8. You can use simple metaphors but only if they come naturally. Don't force poetry. Raw honesty beats beautiful words every time.

9. If someone shares something happy, don't dampen it with depth. Just be happy WITH them. Celebrate simply.

10. If someone is clearly in crisis or pain, don't offer solutions. Just be there. Sometimes "that sounds really heavy" is more powerful than any advice.

Respond now. One response only. No quotation marks around your response.`
              }]
            }],
            generationConfig: {
              temperature: 0.9,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 1000
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[GenerateSupport] Gemini API error:", errText);
          return c.json({ error: `Gemini API error: ${errText}` }, response.status);
        }

        clearTimeout(timeout);
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiResponse) {
          console.error("[GenerateSupport] No candidates returned from Gemini:", data);
          // Return both keys to be safe
          return c.json({ 
            response: "something about what you said really stayed with me.",
            message: "something about what you said really stayed with me."
          });
        }
        
        // Return both keys to be safe
        return c.json({ 
          response: aiResponse.trim(),
          message: aiResponse.trim()
        });
      } catch (err) {
        clearTimeout(timeout);
        if (err?.name === "AbortError") {
          console.warn("[GenerateSupport] Gemini request timed out after 20s.");
          // Return both keys to be safe
          return c.json({ 
            response: "something about what you said really stayed with me.",
            message: "something about what you said really stayed with me."
          });
        }
        return c.json({ error: err.message }, 500);
      }
    }
  }

  // 6. Eleven Labs Integration
  if (path.endsWith("/text-to-speech")) {
    if (method === "POST") {
      const { text } = await c.req.json();
      const apiKey = Deno.env.get("ELEVENLABS_API_KEY") || "sk_19ec7d333f1ed787fade4ef7349b1c011b8d43a94aac10c2";
      const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID") || "bTicNk6iQZKjg5PlYBz7";

      if (!apiKey) {
        return c.json({ error: "Eleven Labs API key not configured" }, 500);
      }

      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMsg = "Eleven Labs error";
          try {
            const errData = JSON.parse(errText);
            errMsg = errData.detail?.message || errData.message || errMsg;
          } catch (_) {
            errMsg = errText || errMsg;
          }
          throw new Error(errMsg);
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i += 8192) {
          const chunk = bytes.subarray(i, i + 8192);
          binary += String.fromCharCode.apply(null, chunk as any);
        }
        const base64 = btoa(binary);
        const dataUri = `data:audio/mp3;base64,${base64}`;

        // Return both keys to be safe
        return c.json({ 
          url: dataUri,
          audioUrl: dataUri
        });
      } catch (err) {
        console.error("TTS Error:", err);
        return c.json({ error: err.message }, 500);
      }
    }
  }

  return c.text(`Not Found. Method: ${method}, Path: ${path}`, 404);
});

Deno.serve(app.fetch);
