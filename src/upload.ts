import { AwsClient } from "aws4fetch";
import { S3Client } from "bun";
import { BUCKET, IMMUTABLE, SHORT } from "./config";
import type { ArtMap } from "./map";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function r2() {
  const endpoint = `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  const credentials = { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") };
  const s3 = new S3Client({ ...credentials, bucket: BUCKET, endpoint, region: "auto" });
  const aws = new AwsClient({ ...credentials, service: "s3", region: "auto" });
  async function put(key: string, body: ArrayBuffer | string, type: string, cache: string) {
    const url = `${endpoint}/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const res = await aws.fetch(url, { method: "PUT", body, headers: { "Content-Type": type, "Cache-Control": cache } });
    if (!res.ok) throw new Error(`PUT ${key} failed: ${res.status} ${await res.text()}`);
  }
  async function list(prefix: string): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    let continuationToken: string | undefined;
    do {
      const page = await s3.list({ prefix, continuationToken });
      for (const item of page.contents ?? []) found.set(item.key, (item.eTag ?? "").replaceAll('"', ""));
      continuationToken = page.isTruncated ? page.nextContinuationToken : undefined;
    } while (continuationToken);
    return found;
  }
  return { s3, put, list };
}

export async function publish(map: ArtMap, files: Map<string, string>, concurrency = 16) {
  const { put, list } = r2();
  const existing = await list(`${map.game}/`);
  const todo: [string, ArrayBuffer][] = [];
  for (const [image, file] of files) {
    const body = await Bun.file(file).arrayBuffer();
    const md5 = new Bun.CryptoHasher("md5").update(body).digest("hex");
    if (existing.get(`${map.game}/${image}`) !== md5) todo.push([image, body]);
  }
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < todo.length) {
        const [image, body] = todo[next++]!;
        await put(`${map.game}/${image}`, body, "image/webp", IMMUTABLE);
      }
    }),
  );
  const json = JSON.stringify(map);
  await put(`maps/${map.game}/${map.version}.json`, json, "application/json", IMMUTABLE);
  await put(`maps/${map.game}/latest.json`, json, "application/json", SHORT);
  return { uploaded: todo.length, unchanged: files.size - todo.length };
}
