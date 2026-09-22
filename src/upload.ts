import { AwsClient } from "aws4fetch";
import { S3Client } from "bun";
import { BUCKET, IMMUTABLE, SHORT } from "./config";
import type { ArtMap } from "./map";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function r2() {
  const endpoint = `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  const credentials = { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") };
  const s3 = new S3Client({ ...credentials, bucket: BUCKET, endpoint, region: "auto" });
  const aws = new AwsClient({ ...credentials, service: "s3", region: "auto" });
  async function put(key: string, body: ArrayBuffer | string, type: string, cache: string) {
    const res = await aws.fetch(`${endpoint}/${BUCKET}/${key}`, {
      method: "PUT",
      body,
      headers: { "Content-Type": type, "Cache-Control": cache },
    });
    if (!res.ok) throw new Error(`PUT ${key} failed: ${res.status} ${await res.text()}`);
  }
  async function keys(prefix: string): Promise<Set<string>> {
    const found = new Set<string>();
    let continuationToken: string | undefined;
    do {
      const page = await s3.list({ prefix, continuationToken });
      for (const item of page.contents ?? []) found.add(item.key);
      continuationToken = page.isTruncated ? page.nextContinuationToken : undefined;
    } while (continuationToken);
    return found;
  }
  return { put, keys };
}

export async function publish(map: ArtMap, files: Map<string, string>, concurrency = 16) {
  const { put, keys } = r2();
  const existing = await keys("img/");
  const todo = [...files].filter(([hash]) => !existing.has(`img/${hash}.webp`));
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < todo.length) {
        const [hash, file] = todo[next++]!;
        await put(`img/${hash}.webp`, await Bun.file(file).arrayBuffer(), "image/webp", IMMUTABLE);
      }
    }),
  );
  const json = JSON.stringify(map);
  await put(`maps/${map.game}/${map.version}.json`, json, "application/json", IMMUTABLE);
  await put(`maps/${map.game}/latest.json`, json, "application/json", SHORT);
  return { uploaded: todo.length, reused: files.size - todo.length };
}
