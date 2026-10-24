import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'flyers');

const W = 1080;
const H = 1440;

function flyerSvg(options: {
  background: string;
  accent: string;
  title: string;
  lines: string[];
  footer: string;
  badge?: string;
}): string {
  const lineText = options.lines
    .map((line, index) => {
      const y = 640 + index * 84;
      return `<text x="540" y="${y}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="46" font-weight="700" fill="${options.accent}">${line}</text>`;
    })
    .join('\n  ');
  const badge = options.badge
    ? `<rect x="290" y="1180" width="500" height="96" rx="48" fill="none" stroke="${options.accent}" stroke-width="6"/>
  <text x="540" y="1244" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="700" fill="${options.accent}">${options.badge}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${options.background}"/>
  <rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="${options.accent}" stroke-width="4"/>
  <text x="540" y="300" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="86" font-weight="700" fill="${options.accent}">${options.title}</text>
  <line x1="240" y1="360" x2="840" y2="360" stroke="${options.accent}" stroke-width="3"/>
  ${lineText}
  ${badge}
  <text x="540" y="1360" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="30" font-style="italic" fill="${options.accent}">${options.footer}</text>
</svg>`;
}

const flyers = [
  {
    file: 'sample-bakery.webp',
    svg: flyerSvg({
      background: '#F6EFDF',
      accent: '#4A2B14',
      title: 'Sample Bakery',
      lines: ['Weekend special', '20% off fresh bread', 'Fri 07:00 – Sun 13:00'],
      footer: 'Demo flyer — not a real business',
    }),
  },
  {
    file: 'sample-wines.webp',
    svg: flyerSvg({
      background: '#7B1E3A',
      accent: '#F6EFDF',
      title: 'Sample Wines',
      lines: ['Tasting evening', 'Friday 19:00', 'R80 per person'],
      footer: 'Demo flyer — not a real business',
      badge: '18+ ONLY',
    }),
  },
];

await fs.mkdir(outDir, { recursive: true });
for (const flyer of flyers) {
  const buffer = await sharp(Buffer.from(flyer.svg)).webp({ quality: 88 }).toBuffer();
  const target = path.join(outDir, flyer.file);
  await fs.writeFile(target, buffer);
  const meta = await sharp(target).metadata();
  console.log(`${flyer.file}: ${meta.width}x${meta.height}, ${Math.round(buffer.length / 1024)} KB`);
}
