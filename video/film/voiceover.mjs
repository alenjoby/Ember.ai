// Narration for the film with ElevenLabs (same voice and model as Ember in the app).
//
//   1. Put your key in video/film/.env (gitignored), never in the code:
//        ELEVENLABS_API_KEY=...
//        ELEVENLABS_VOICE_ID=...      (the voice the app uses; from your ElevenLabs dashboard)
//   2. node voiceover.mjs            (all lines)   or   node voiceover.mjs hook close-1
//
// Writes public/vo/<name>.mp3 and src/voiceover.json ({ name: seconds }), which the film uses to
// time each scene to its narration. Lines already generated are kept unless named again.
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const LINES = {
  'hook': "It's three a.m. You can't say it to anyone you know.",
  'problem-1': 'One in six people worldwide feel lonely.',
  'problem-2': 'Every year, more than seven hundred thousand people die by suicide.',
  'problem-3': 'Most of them never told anyone how they felt.',
  'turn-1': 'What if you could just... let it out?',
  'turn-2': 'Ember. Release what you feel. Someone will answer.',
  'showcase': 'Every feeling becomes a lantern of light and sound.',
  'dawn-1': 'Lanterns fade after twenty-four hours.',
  'dawn-2': 'Say it. Let it go.',
  'proof': 'Real. Safe. Live.',
  'close-1': 'Tonight, someone is still awake.',
  'close-2': "Now, they don't have to be alone with it.",
};

// .env next to this script (simple KEY=value lines); real environment variables win.
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
if (!KEY || !VOICE) {
  console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in video/film/.env first.');
  process.exit(1);
}

const outDir = path.resolve('public/vo');
fs.mkdirSync(outDir, { recursive: true });
const manifestFile = path.resolve('src/voiceover.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(LINES);
for (const name of names) {
  if (!LINES[name]) { console.log(`unknown line "${name}"`); continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: LINES[name],
      model_id: 'eleven_multilingual_v2',
      // Calm and steady for narration: a bit more stable than the app's replies.
      voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.15 },
    }),
  });
  if (!res.ok) {
    console.error(`✗ ${name}: ElevenLabs ${res.status} ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  const file = path.join(outDir, `${name}.mp3`);
  const raw = path.join(outDir, `${name}.raw.mp3`);
  fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // ElevenLabs comes out quiet (about -23 dB); normalise to -16 LUFS so the voice sits on top
  // of the music and the Raylight effects.
  execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', file]);
  fs.rmSync(raw);
  // Length from ffmpeg's report ("Duration: 00:00:02.53").
  let info = '';
  try { execFileSync(ffmpegPath, ['-hide_banner', '-i', file], { stdio: 'pipe' }); } catch (e) { info = String(e.stderr); }
  const [, h, m, s] = /Duration: (\d+):(\d+):([\d.]+)/.exec(info) ?? [];
  manifest[name] = Math.round((+h * 3600 + +m * 60 + +s) * 100) / 100;
  console.log(`✓ ${name} (${manifest[name]} s)  "${LINES[name]}"`);
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nWrote ${path.relative(process.cwd(), manifestFile)}`);
