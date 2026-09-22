import path from "node:path";
import { Glob } from "bun";
import sharp from "sharp";

sharp.cache(false);

// PoE1 skill gem art is a symbol, a shadow and a stone side by side; the game draws them stacked.
async function stack(file: string): Promise<boolean> {
  const { width, height } = await sharp(file).metadata();
  if (!width || !height || width < height * 2.5) return false;
  const cell = Math.floor(width / 3);
  const part = (i: number) => sharp(file).extract({ left: i * cell, top: 0, width: cell, height }).png().toBuffer();
  const [symbol, shadow, stone] = await Promise.all([part(0), part(1), part(2)]);
  const out = await sharp(stone).composite([{ input: shadow }, { input: symbol }]).webp({ lossless: true }).toBuffer();
  await Bun.write(file, out);
  return true;
}

export async function stackGemStrips(dir: string): Promise<number> {
  let stacked = 0;
  for await (const file of new Glob("Art/2DItems/Gems/**/*.webp").scan({ cwd: dir })) {
    if (await stack(path.join(dir, file))) stacked++;
  }
  return stacked;
}
