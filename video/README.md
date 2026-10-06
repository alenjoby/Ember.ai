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
