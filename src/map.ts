import path from "node:path";
import { BASE_URL, type Game } from "./config";

export interface ArtMap {
  game: Game;
  version: string;
  images: string;
  bases: Record<string, string>;
  uniques: Record<string, string>;
}

interface Row {
  name?: string;
  release_state?: string;
  is_alternate_art?: boolean;
  visual_identity?: { dds_file?: string };
}

async function rows(file: string): Promise<[string, Row][]> {
  const data = await Bun.file(file).json();
  return (Array.isArray(data) ? data.map((row, i) => [String(i), row]) : Object.entries(data)) as [string, Row][];
}

function sorted(record: Map<string, string>): Record<string, string> {
  return Object.fromEntries([...record].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export async function buildMap(game: Game, version: string, dir: string) {
  const files = new Map<string, string>();
  const missing: string[] = [];
  const hashes = new Map<string, string | null>();

  async function hashOf(dds: string): Promise<string | null> {
    if (hashes.has(dds)) return hashes.get(dds)!;
    const file = Bun.file(path.join(dir, dds.replace(/\.dds$/i, ".webp")));
    let hash: string | null = null;
    if (await file.exists()) {
      hash = new Bun.CryptoHasher("sha256").update(await file.arrayBuffer()).digest("hex").slice(0, 16);
      files.set(hash, file.name!);
    } else {
      missing.push(dds);
    }
    hashes.set(dds, hash);
    return hash;
  }

  async function collect(list: [string, Row][], skip: (row: Row) => boolean) {
    const out = new Map<string, string>();
    const ranked = list
      .filter(([, row]) => row.name && row.visual_identity?.dds_file && !skip(row))
      .sort(([a, x], [b, y]) => Number(x.release_state === "released" ? 0 : 1) - Number(y.release_state === "released" ? 0 : 1) || (a < b ? -1 : a > b ? 1 : 0));
    for (const [, row] of ranked) {
      if (out.has(row.name!)) continue;
      const hash = await hashOf(row.visual_identity!.dds_file!);
      if (hash) out.set(row.name!, hash);
    }
    return sorted(out);
  }

  const map: ArtMap = {
    game,
    version,
    images: `${BASE_URL}/img/`,
    bases: await collect(await rows(path.join(dir, "base_items.min.json")), () => false),
    uniques: await collect(await rows(path.join(dir, "uniques.min.json")), (row) => row.is_alternate_art === true),
  };
  return { map, files, missing: [...new Set(missing)].sort() };
}
