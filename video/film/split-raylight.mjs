// Splits the video exported from Raylight (intro → lantern release → outro) into the three
// clips the film uses: public/raylight-intro.mp4, raylight-lantern.mp4, raylight-outro.mp4.
//
//   node split-raylight.mjs path/to/raylight-export.mp4
//
// Cut points match the Raylight project "Ember.ai – film shots" (shots at 0 / 3.64 / 13.64 s).
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node split-raylight.mjs path/to/raylight-export.mp4');
  process.exit(1);
}

const CUTS = [
  { name: 'raylight-intro.mp4', from: 0, dur: 3.64 },
  { name: 'raylight-lantern.mp4', from: 3.64, dur: 10 },
  { name: 'raylight-outro.mp4', from: 13.64, dur: 4.04 },
];

fs.mkdirSync('public', { recursive: true });
for (const c of CUTS) {
  const out = path.join('public', c.name);
  // Re-encode (not stream copy) so each clip starts exactly on its cut, not on the nearest keyframe.
  execFileSync(ffmpegPath, [
    '-y', '-loglevel', 'error', '-ss', String(c.from), '-i', input, '-t', String(c.dur),
    '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', out,
  ]);
  console.log(`✓ ${out}`);
}
