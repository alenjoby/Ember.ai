// Copies the recorded app clips (../out, made by `npm run record` in video/) into public/,
// where Remotion's staticFile() can load them.
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('../out');
const dst = path.resolve('public');
const need = ['02-sky.mp4', '03-release.mp4', '04-moderation.mp4', '05-crisis.mp4', '03-release-ember-voice.mp3', '05-crisis-ember-voice.mp3'];
fs.mkdirSync(dst, { recursive: true });
const missing = need.filter((f) => !fs.existsSync(path.join(src, f)));
if (missing.length) {
  console.error(`Missing clips in video/out: ${missing.join(', ')}\nRun "npm run record" in video/ first.`);
  process.exit(1);
}
for (const f of need) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log(`Copied ${need.length} clips into public/`);
