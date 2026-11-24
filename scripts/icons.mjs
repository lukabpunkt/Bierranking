// Erzeugt PNG-Icons aus public/icons/icon.svg:  node scripts/icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icons/icon.svg");
const out = "public/icons";

await sharp(svg).resize(192, 192).png().toFile(`${out}/icon-192.png`);
await sharp(svg).resize(512, 512).png().toFile(`${out}/icon-512.png`);
await sharp(svg).resize(180, 180).flatten({ background: "#F59E0B" }).png().toFile(`${out}/apple-touch-icon.png`);

// Maskable: Motiv in der sicheren Zone (80 %), vollflächiger Hintergrund
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#F59E0B" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(`${out}/icon-maskable-512.png`);

console.log("Icons erzeugt.");
