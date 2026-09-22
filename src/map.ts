import path from "node:path";
import { BASE_URL, type Game } from "./config";

export interface ArtMap {
  game: Game;
  version: string;
  images: string;
  bases: Record<string, string>;
  uniques: Record<string, string>;
  sockets: Record<string, string>;
  files: Record<string, string>;
}

interface Row {
  name?: string;
  release_state?: string;
  is_alternate_art?: boolean;
  visual_identity?: { dds_file?: string };
  skill_name?: string;
  base_item?: { id?: string };
}

interface Overrides {
  bases?: Record<string, string>;
}

async function rows(file: string): Promise<[string, Row][]> {
  const data = await Bun.file(file).json();
  return (Array.isArray(data) ? data.map((row, i) => [String(i), row]) : Object.entries(data)) as [string, Row][];
}

const byKey = <T>([a]: [string, T], [b]: [string, T]) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (record: Map<string, string>) => Object.fromEntries([...record].sort(byKey));
const ascii = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "");

export async function buildMap(game: Game, version: string, dir: string, sockets: Record<string, string>) {
  const files = new Map<string, string>();
  const tags = new Map<string, string>();
  const missing = new Set<string>();

  async function art(dds: string): Promise<string | null> {
    const image = dds.replace(/\.dds$/i, ".webp");
    if (tags.has(image)) return image;
    const file = Bun.file(path.join(dir, image));
    if (!(await file.exists())) {
      missing.add(dds);
      return null;
    }
    tags.set(image, new Bun.CryptoHasher("sha256").update(await file.arrayBuffer()).digest("hex").slice(0, 8));
    files.set(image, file.name!);
    return image;
  }

  async function collect(list: [string, Row][], skip: (row: Row) => boolean) {
    const out = new Map<string, string>();
    const released = (row: Row) => (row.release_state === "released" ? 0 : 1);
    const ranked = list
      .filter(([, row]) => row.name && row.visual_identity?.dds_file && !skip(row))
      .sort((a, b) => released(a[1]) - released(b[1]) || byKey(a, b));
    for (const [, row] of ranked) {
      if (out.has(row.name!)) continue;
      const image = await art(row.visual_identity!.dds_file!);
      if (image) out.set(row.name!, image);
    }
    return out;
  }

  const baseRows = await rows(path.join(dir, "base_items.min.json"));
  const bases = await collect(baseRows, () => false);
  const uniques = await collect(await rows(path.join(dir, "uniques.min.json")), (row) => row.is_alternate_art === true);

  const overridesFile = Bun.file(`overrides/${game}.json`);
  const overrides: Overrides = (await overridesFile.exists()) ? await overridesFile.json() : {};
  const byId = new Map(baseRows);
  if (game === "poe1") {
    const gemRows = await rows(path.join(dir, "skill_gems.min.json"));
    for (const [, gem] of gemRows) {
      if (!gem.skill_name || bases.has(gem.skill_name)) continue;
      const dds = gem.base_item?.id && byId.get(gem.base_item.id)?.visual_identity?.dds_file;
      const image = dds && (await art(dds));
      if (image) bases.set(gem.skill_name, image);
    }
  }
  for (const [name, id] of Object.entries(overrides.bases ?? {})) {
    const dds = byId.get(id)?.visual_identity?.dds_file;
    const image = dds && (await art(dds));
    if (!image) throw new Error(`${game}: override "${name}" names ${id}, which has no exported art`);
    bases.set(name, image);
  }
  for (const record of [bases, uniques]) {
    for (const [name, image] of [...record]) {
      const plain = ascii(name);
      if (plain !== name && !record.has(plain)) record.set(plain, image);
    }
  }

  const socketImages = new Map<string, string>();
  for (const [key, image] of Object.entries(sockets)) {
    if (!(await art(image.replace(/\.webp$/, ".dds")))) throw new Error(`${game}: socket ${key} was not exported`);
    socketImages.set(key, image);
  }

  const map: ArtMap = {
    game,
    version,
    images: `${BASE_URL}/${game}/`,
    bases: sorted(bases),
    uniques: sorted(uniques),
    sockets: Object.fromEntries(socketImages),
    files: sorted(tags),
  };
  return { map, files, missing: [...missing].sort() };
}
