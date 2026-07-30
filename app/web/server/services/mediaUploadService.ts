import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { z } from "zod";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const variantSchema = z.enum(["hero-desktop", "hero-mobile"]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const HERO_CACHE_CONTROL = "public, max-age=300, must-revalidate";

function buildHeroKey(siteId: string, variant: string) {
  const version = Date.now().toString(36);
  return `clientes/${siteId}/producto/v1/${variant}-${version}.webp`;
}

function getConfig() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "partnerhub-media-prod";
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL ?? "https://media.partnerhub.club").replace(/\/$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }

  return {
    client: new S3Client({ endpoint, region: "auto", credentials: { accessKeyId, secretAccessKey } }),
    bucket,
    publicBaseUrl
  };
}

export const mediaUploadService = {
  async uploadHero(input: { siteId: string; variant: string; file: File }) {
    const siteId = siteIdSchema.parse(input.siteId.toLowerCase());
    const variant = variantSchema.parse(input.variant);

    if (!input.file || input.file.size === 0) {
      throw new Error("The image file is empty.");
    }

    if (input.file.size > MAX_IMAGE_BYTES) {
      throw new Error("Hero images must be 12 MB or smaller.");
    }

    if (!input.file.type.startsWith("image/")) {
      throw new Error("Only image files are accepted for heroes.");
    }

    const { client, bucket, publicBaseUrl } = getConfig();
    const key = buildHeroKey(siteId, variant);
    const body = await sharp(Buffer.from(await input.file.arrayBuffer()))
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: HERO_CACHE_CONTROL
      })
    );

    return { siteId, variant, key, url: `${publicBaseUrl}/${key}`, bytes: body.byteLength };
  }
};
