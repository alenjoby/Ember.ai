// Records scripted scenes of the real Ember UI (Playwright) for the demo film.
//
//   cd video && npm run setup          (once: installs Playwright + Chromium + ffmpeg)
//   npm run record                     (all scenes)
//   npm run record -- sky crisis       (only some scenes)
//
// Env: BASE_URL (default http://localhost:5173, the Vite dev server; or your Vercel URL)
//      MOBILE=1 for a phone-sized recording (430x932) instead of 1920x1080.
// Output: video/out/<scene>.mp4 (+ the AI voice reply .mp3 where a scene has one;
//         Playwright records picture only, so add the voice in the edit).
//
// Scenes that release a thought post REAL data to the backend (and use a little AI credit);
// the script deletes those thoughts again at the end of the scene with their owner token.
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const MOBILE = process.env.MOBILE === '1';
const SIZE = MOBILE ? { width: 430, height: 932 } : { width: 1920, height: 1080 };
const OUT = path.resolve('out');
fs.mkdirSync(OUT, { recursive: true });

// Public project id + publishable key, read from the app (no secrets here).
const info = fs.readFileSync(path.resolve('../supabase/info.tsx'), 'utf8');
const PROJECT = /projectId = "([^"]+)"/.exec(info)[1];
const ANON = /publicAnonKey = "([^"]+)"/.exec(info)[1];
const API = `https://${PROJECT}.supabase.co`;
const HEADERS = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── helpers ────────────────────────────────────────────────────────

// Playwright's own Chromium if installed; otherwise the Edge or Chrome already on this machine
// (`npx playwright install chromium` can time out on slow connections).
let launchOptions = null;
async function launchBrowser() {
  if (launchOptions) return chromium.launch(launchOptions);
  for (const opts of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try {
      const b = await chromium.launch(opts);
      launchOptions = opts;
      console.log(`  (browser: ${opts.channel || 'playwright chromium'})`);
      return b;
    } catch { /* try the next one */ }
  }
  throw new Error('No browser found: run `npx playwright install chromium`, or install Edge/Chrome.');
}

async function scene(name, { query = '', onboarding = false } = {}, run) {
  console.log(`\n▶ ${name}`);
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: SIZE },
  });
  if (!onboarding) {
    await context.addInitScript(() => {
      localStorage.setItem('hasCompletedOnboarding', 'true');
      localStorage.setItem('ember_sound', 'off');
    });
  }
  const page = await context.newPage();
  const created = [];
  try {
    await page.goto(`${BASE_URL}/${query}`);
    if (!onboarding) await page.getByLabel('Share a thought').waitFor({ timeout: 30000 });
    await run(page, created);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message.split('\n')[0]}`);
  } finally {
    // Delete thoughts this scene released, using their owner tokens.
    const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('ember_owner_tokens') || '{}')).catch(() => ({}));
    for (const id of created) {
      if (!tokens[id]) continue;
      await fetch(`${API}/functions/v1/server/thoughts/${id}`, { method: 'DELETE', headers: { ...HEADERS, 'X-Owner-Token': tokens[id] } }).catch(() => {});
    }
    const video = page.video();
    await context.close();
    await browser.close();
    if (video) {
      const webm = await video.path();
      const mp4 = path.join(OUT, `${name}.mp4`);
      execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', mp4]);
      fs.rmSync(webm, { force: true });
      console.log(`  ✓ ${path.relative(process.cwd(), mp4)}`);
    }
  }
}

/** Open compose, type like a person, pick an emotion, release. Returns the new thought id. */
async function release(page, text, emotion) {
  await page.getByLabel('Share a thought').click();
  const box = page.getByPlaceholder('Whisper into the void...');
  await box.waitFor();
  await sleep(600);
  await box.click();
  await page.keyboard.type(text, { delay: 55 });
  await sleep(500);
  if (emotion) {
    // .last(): the same label exists as a filter chip in the HUD; the compose tag comes later in the DOM.
    await page.getByRole('button', { name: emotion, exact: true }).last().click();
    await sleep(600);
  }
  const before = await ownedIds(page);
  await page.getByText('Release into the sky').click();
  for (let i = 0; i < 120; i++) { // up to 30 s: crisis posts run two AI checks
    await sleep(250);
    const now = await ownedIds(page);
    const id = now.find((x) => !before.includes(x));
    if (id) return id;
  }
  return null; // blocked (moderation) or failed
}

async function ownedIds(page) {
  return page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ember_owner_tokens') || '{}')));
}

/** Wait until Ember (AI) has replied to a thought; returns the reply. */
async function waitForEmber(id, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const feed = await (await fetch(`${API}/rest/v1/rpc/get_feed`, { method: 'POST', headers: HEADERS, body: '{}' })).json();
    const reply = feed.find((t) => t.id === id)?.responses.find((r) => r.isAI);
    if (reply) return reply;
    await sleep(1000);
  }
  return null;
}

async function saveVoice(reply, name) {
  if (!reply?.audioUrl) return;
  const buf = Buffer.from(await (await fetch(reply.audioUrl)).arrayBuffer());
  const file = path.join(OUT, `${name}-ember-voice.mp3`);
  fs.writeFileSync(file, buf);
  console.log(`  ♪ ${path.relative(process.cwd(), file)}  ("${reply.content}")`);
}

/** Slow drag on the canvas (pans the sky). */
async function pan(page, dx, dy, steps = 60) {
  const x = SIZE.width * 0.5;
  const y = SIZE.height * 0.22;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  await page.mouse.up();
}

async function zoom(page, times, out = true) {
  await page.mouse.move(SIZE.width / 2, SIZE.height / 2);
  for (let i = 0; i < times; i++) {
    await page.getByLabel(out ? 'Zoom out' : 'Zoom in').click();
    await sleep(450);
  }
}

// ─── scenes ─────────────────────────────────────────────────────────

const SCENES = {
  // First visit: the three onboarding slides, then the tutorial lantern.
  async onboarding() {
    await scene('01-onboarding', { onboarding: true }, async (page) => {
      for (const label of ['Continue', 'Continue', 'Enter Ember']) {
        await sleep(3500);
        await page.getByRole('button', { name: label }).click();
      }
      await sleep(6000);
    });
  },

  // The full sky: many lanterns, constellation threads, slow pan and zoom out.
  async sky() {
    await scene('02-sky', { query: '?perf=70&video=1' }, async (page) => {
      await sleep(2500);
      // force: lanterns float forever, so Playwright would wait for them to be 'stable' until timeout.
      await page.getByText('first night in a new city', { exact: false }).first().hover({ force: true, timeout: 3000 }).catch(() => {});
      await sleep(2500);
      await pan(page, -500, 120, 90);
      await sleep(1500);
      await zoom(page, 3, true);
      await sleep(4000);
      await zoom(page, 2, false);
      await sleep(2000);
    });
  },

  // Release a lonely thought → lantern lights up → Ember (AI) replies → open it.
  async release() {
    await scene('03-release', { query: '?perf=40&video=1' }, async (page, created) => {
      // Unique text (not one of the test-lantern lines), so the click opens THIS lantern.
      const text = 'moved to bangalore for work and the flat is so quiet at night';
      const id = await release(page, text, 'Lonely');
      if (!id) throw new Error('release failed');
      created.push(id);
      await sleep(5000);
      const reply = await waitForEmber(id);
      await saveVoice(reply, '03-release');
      // The server has Ember's reply; reload so the app surely shows it (a first take opened the
      // lantern before the app had refreshed and showed "Be the first to respond").
      await page.reload();
      await page.getByLabel('Share a thought').waitFor({ timeout: 30000 });
      await sleep(2500);
      await page.getByText(text).first().click({ force: true, timeout: 5000 });
      await sleep(8000);
    });
  },

  // Moderation: hate is stopped with a gentle popup.
  async moderation() {
    await scene('04-moderation', { query: '?perf=30&video=1' }, async (page) => {
      await page.getByLabel('Share a thought').click();
      const box = page.getByPlaceholder('Whisper into the void...');
      await box.waitFor();
      await box.click();
      await page.keyboard.type('you are worthless and nobody wants you here', { delay: 55 });
      // The live check flags it while typing: gentle inline warning, button turns to Blocked.
      await sleep(5000);
    });
  },

  // Crisis: warning card with the helpline + Ember's immediate calming reply.
  async crisis() {
    await scene('05-crisis', { query: '?perf=30&video=1' }, async (page, created) => {
      const text = "I don't think I can do this anymore";
      const id = await release(page, text);
      if (!id) throw new Error('release failed');
      created.push(id);
      await sleep(7000); // crisis card on screen
      const reply = await waitForEmber(id, 30000);
      await saveVoice(reply, '05-crisis');
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(800);
      await page.getByText(text).first().click({ force: true, timeout: 5000 }).catch(() => {});
      await sleep(7000);
    });
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENES);
console.log(`Recording ${names.join(', ')} from ${BASE_URL} at ${SIZE.width}x${SIZE.height}`);
for (const n of names) {
  if (!SCENES[n]) { console.log(`unknown scene "${n}" (have: ${Object.keys(SCENES).join(', ')})`); continue; }
  await SCENES[n]();
}
console.log(`\nDone. Clips in ${OUT}`);
