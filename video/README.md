# Ember demo recorder

Records scripted scenes of the **real Ember UI** with Playwright, for the demo film.
Motion graphics / titles / music are done in the edit; these are the "it's real" shots.

```bash
cd video
npm run setup                  # once: Playwright + ffmpeg (+ Chromium; if that download times out,
                               # the script uses your installed Edge or Chrome instead)
npm run record                 # all scenes
npm run record -- sky crisis   # only some scenes
```

- `BASE_URL` (default `http://localhost:5173`, start the app with `npm run dev` first, or use the Vercel URL)
- `MOBILE=1` records at phone size (430×932) instead of 1920×1080.

Output in `video/out/`: one `.mp4` per scene, plus `*-ember-voice.mp3` (Ember's spoken reply)
for scenes that have one. Playwright records picture only: add the voice and music in the edit.

| Scene | What it shows |
|---|---|
| `onboarding` | First visit: the 3 onboarding slides and the tutorial |
| `sky` | Full sky (70 test lanterns), constellation threads, pan, zoom out and back |
| `release` | Type a lonely thought, pick "Lonely", release → lantern lights → Ember (AI) replies → open it |
| `moderation` | Typing a hateful message → gentle inline warning, button turns "Blocked" |
| `crisis` | "I don't think I can do this anymore" → helpline card (Tele-MANAS 14416) + Ember's calming reply |

The page runs with `?video=1`: only the test lanterns and thoughts released by the script are shown
(never real people's posts), with realistic texts and no dev buttons or FPS banner. `release` and
`crisis` post real thoughts (small AI cost) and delete them again at the end of the scene.

## The film (Remotion)

`video/film/` is a ~2 min Remotion film that follows the film prompt: hook → problem → logo →
the real recordings from `video/out/` in framed windows with captions → crisis scene (with Ember's
real voice) → "lanterns fade after 24h" → proof points → close with helplines.

```bash
cd video/film
npm install
npm run studio     # live preview + timeline in the browser
npm run render     # → video/film/out/ember-film.mp4
```

- Record the app clips first (`npm run record` in `video/`); `npm run clips` copies them into `public/`.
- If Remotion can't download its headless browser, add
  `--browser-executable="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"` to the render command.
- Everything animates from `useCurrentFrame()` (Remotion renders frame by frame), so the lanterns in
  the film use their own frame-driven `Lantern` in `src/ui.tsx`, not the app's CSS-animated one.
- Picture + Ember's voice only: add music in Remotion (`<Audio>`) or in your editor.
- The two statistics (loneliness 1 in 6, 700,000+ suicides a year, WHO) should be checked against
  WHO's current pages before publishing.
- Remotion is free for individuals and small teams (≤3 people); see remotion.dev/license.
