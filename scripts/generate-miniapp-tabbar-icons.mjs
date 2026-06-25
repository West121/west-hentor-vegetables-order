import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "apps/miniapp/src/assets/tabbar");
const distDir = resolve(repoRoot, "apps/miniapp/dist/assets/tabbar");

const size = 81;
const viewBoxSize = 162;
const active = "#159456";
const inactive = "#8AA09A";

function svg(content) {
  return Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${viewBoxSize}" height="${viewBoxSize}" fill="none"/>
  ${content}
</svg>
`);
}

const icons = {
  "home-default.png": svg(`
    <g stroke="${inactive}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M42 82.5L81 48L120 82.5"/>
      <path d="M52 77V119C52 123.5 55.5 127 60 127H102C106.5 127 110 123.5 110 119V77"/>
      <path d="M74 127V101C74 97.7 76.7 95 80 95H82C85.3 95 88 97.7 88 101V127"/>
      <path d="M101 54C111 45 122 43 130 48C129 59 122 68 110 70C105 66 102 61 101 54Z"/>
      <path d="M111 63C116 60 121 56 126 50"/>
    </g>
  `),
  "home-active.png": svg(`
    <g stroke="${active}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M42 82.5L81 48L120 82.5"/>
      <path d="M52 77V119C52 123.5 55.5 127 60 127H102C106.5 127 110 123.5 110 119V77"/>
      <path d="M74 127V101C74 97.7 76.7 95 80 95H82C85.3 95 88 97.7 88 101V127"/>
    </g>
    <path d="M100 54C111 43 123 42 132 48C131 62 122 72 108 73C103 68 100 61 100 54Z" fill="${active}"/>
    <path d="M109 64C116 60 122 55 128 49" stroke="white" stroke-width="4" stroke-linecap="round"/>
  `),
  "me-default.png": svg(`
    <g stroke="${inactive}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="81" cy="62" r="22"/>
      <path d="M45 126C50 105 63 94 81 94C99 94 112 105 117 126"/>
      <path d="M104 44C111 35 121 33 129 38C129 49 122 58 111 60C106 56 104 51 104 44Z"/>
      <path d="M112 53C117 50 122 45 126 39"/>
    </g>
  `),
  "me-active.png": svg(`
    <circle cx="81" cy="62" r="22" fill="${active}"/>
    <path d="M45 126C50 105 63 94 81 94C99 94 112 105 117 126" stroke="${active}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M104 44C111 35 121 33 129 38C129 49 122 58 111 60C106 56 104 51 104 44Z" fill="${active}"/>
    <path d="M112 53C117 50 122 45 126 39" stroke="white" stroke-width="4" stroke-linecap="round"/>
  `),
};

mkdirSync(outDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

for (const [filename, source] of Object.entries(icons)) {
  const outPath = resolve(outDir, filename);
  await sharp(source).png({ compressionLevel: 9 }).toFile(outPath);
  copyFileSync(outPath, resolve(distDir, filename));
}
