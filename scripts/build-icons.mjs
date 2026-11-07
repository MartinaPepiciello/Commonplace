// Builds public/icon.svg and the PNG icons. Needs `sharp` (npm i -D sharp).
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { iconSVG } from './icon-source.mjs';

writeFileSync('public/icon.svg', iconSVG({ rounded: true }));
const full = Buffer.from(iconSVG());
const maskable = Buffer.from(iconSVG({ scale: 0.78 }));
await sharp(full).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(full).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(full).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(maskable).resize(512, 512).png().toFile('public/icon-maskable-512.png');
console.log('icons written');
