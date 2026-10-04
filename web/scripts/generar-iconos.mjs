// Genera los PNG del manifiesto a partir de public/icons/icon.svg.
// Uso: npm run icons
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = new URL("../public/icons/", import.meta.url);
const svg = await readFile(new URL("icon.svg", dir));
// La versión "maskable" va a sangre completa (sin esquinas redondeadas): Android recorta la forma.
const sangre = Buffer.from(svg.toString().replace(/rx="\d+"/, 'rx="0"'));

const salidas = [
  ["icon-192.png", svg, 192],
  ["icon-512.png", svg, 512],
  ["apple-touch-icon.png", sangre, 180],
  ["icon-maskable-512.png", sangre, 512],
];

for (const [nombre, fuente, tam] of salidas) {
  await sharp(fuente).resize(tam, tam).png().toFile(fileURLToPath(new URL(nombre, dir)));
  console.log("✓", nombre);
}
