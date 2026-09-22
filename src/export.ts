import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { EXPLORER, SCHEMA, type Game } from "./config";

export async function exportGame(game: Game, version: string, out: string): Promise<{ downloads: number; seconds: number }> {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const log = path.join(out, "..", `${version}.log`);
  const started = performance.now();
  const proc = Bun.spawn(
    [
      EXPLORER, "export-data", "--cdn", version, `--${game}`, "--only", "base_items,uniques",
      "--images", "--strip-null", "--flat", "-o", out, ...(SCHEMA ? ["--schema", SCHEMA] : []),
    ],
    { stdout: Bun.file(log), stderr: "pipe" },
  );
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
  const text = await Bun.file(log).text();
  if (code !== 0) {
    throw new Error(`ggpk-explorer exited with ${code} for ${game} ${version}\n${stderr}\n${text.split("\n").slice(-20).join("\n")}`);
  }
  return {
    downloads: text.split("\n").filter((line) => line.includes("[CDN] Downloading")).length,
    seconds: Math.round((performance.now() - started) / 1000),
  };
}
