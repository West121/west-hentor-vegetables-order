import { randomUUID } from "node:crypto";

import { Client } from "minio";

type ObjectStorageConfig = {
  bucket: string;
  endpoint: string;
  port: number;
  useSSL: boolean;
};

type CreateDishImageObjectKeyInput = {
  fileName: string;
  now?: Date;
  randomId?: string;
};

type UploadObjectInput = {
  contentType: string;
  key: string;
  value: Buffer;
};

const DEFAULT_BUCKET = "hentor-assets";

function env(name: string, fallback: string) {
  return process.env[name] ?? fallback;
}

export function getObjectStorageConfig(): ObjectStorageConfig {
  const endpoint = env("MINIO_ENDPOINT", "localhost").replace(/^https?:\/\//, "");

  return {
    bucket: env("MINIO_BUCKET", DEFAULT_BUCKET),
    endpoint,
    port: Number(env("MINIO_PORT", "9000")),
    useSSL: env("MINIO_USE_SSL", "false") === "true",
  };
}

export function createDishImageObjectKey({
  fileName,
  now = new Date(),
  randomId = randomUUID(),
}: CreateDishImageObjectKeyInput) {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext && ["avif", "jpeg", "jpg", "png", "webp"].includes(ext)
    ? ext
    : "jpg";
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `dishes/${year}/${month}/${day}/${randomId}.${safeExt}`;
}

export function buildObjectPublicUrl(
  key: string,
  config: ObjectStorageConfig = getObjectStorageConfig(),
) {
  const protocol = config.useSSL ? "https" : "http";
  return `${protocol}://${config.endpoint}:${config.port}/${config.bucket}/${key}`;
}

function createClient(config = getObjectStorageConfig()) {
  return new Client({
    accessKey: env("MINIO_ACCESS_KEY", "hentor_minio"),
    endPoint: config.endpoint,
    port: config.port,
    secretKey: env("MINIO_SECRET_KEY", "unconfigured"),
    useSSL: config.useSSL,
  });
}

export async function uploadObject({
  contentType,
  key,
  value,
}: UploadObjectInput) {
  const config = getObjectStorageConfig();
  const client = createClient(config);

  await client.putObject(config.bucket, key, value, value.byteLength, {
    "Content-Type": contentType,
  });

  return {
    bucket: config.bucket,
    key,
    url: buildObjectPublicUrl(key, config),
  };
}
