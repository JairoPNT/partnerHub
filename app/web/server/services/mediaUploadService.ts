import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { z } from "zod";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const variantSchema = z.enum(["hero-desktop", "hero-mobile"]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const HERO_CACHE_CONTROL = "public, max-age=60, must-revalidate";

function buildHeroKey(siteId: string, variant: string) {
  const version = Date.now().toString(36);
  return `clientes/${siteId}/producto/v1/${variant}-${version}.webp`;
}

function getConfig() {
  const configuredEndpoint = process.env.R2_ENDPOINT?.trim().replace(/\/$/, "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "partnerhub-media-prod";
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL ?? "https://media.partnerhub.club").replace(/\/$/, "");

  if (!configuredEndpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }

  const endpoint = configuredEndpoint.endsWith(`/${bucket}`)
    ? configuredEndpoint.slice(0, -bucket.length - 1)
    : configuredEndpoint;

  return {
    client: new S3Client({ endpoint, region: "auto", credentials: { accessKeyId, secretAccessKey } }),
    bucket,
    publicBaseUrl
  };
}

function normalizeR2UploadError(error: unknown) {
  const err = error as Error & { $metadata?: { httpStatusCode?: number }; Code?: string; code?: string };
  const statusCode = err.$metadata?.httpStatusCode;
  const code = err.Code ?? err.code;
  const message = err.message || "R2 upload failed.";

  if (statusCode === 401 || statusCode === 403 || /unauthorized|forbidden|access denied/i.test(message)) {
    return new Error(
      "Cloudflare R2 rechazo la carga. Revisa en EasyPanel que R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY sean las credenciales S3 vigentes del bucket, guarda e implementa nuevamente el servicio."
    );
  }

  if (/signature/i.test(message) || code === "SignatureDoesNotMatch") {
    return new Error(
      "Cloudflare R2 rechazo la firma de la solicitud. Verifica que R2_ENDPOINT no tenga espacios y que corresponda al endpoint S3 de la cuenta; el bucket debe ir solo en R2_BUCKET."
    );
  }

  return error instanceof Error ? error : new Error(message);
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

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/webp",
          CacheControl: HERO_CACHE_CONTROL
        })
      );
    } catch (error) {
      throw normalizeR2UploadError(error);
    }

    return { siteId, variant, key, url: `${publicBaseUrl}/${key}`, bytes: body.byteLength };
  },

  async uploadSourcePhoto(input: { token: string; file: File }) {
    if (!input.file || input.file.size === 0) {
      throw new Error("El archivo de imagen está vacío.");
    }

    if (input.file.size > MAX_IMAGE_BYTES) {
      throw new Error("Las fotos deben ser de 12 MB o más pequeñas.");
    }

    if (!input.file.type.startsWith("image/")) {
      throw new Error("Solo se aceptan archivos de imagen para las fotos de negocio.");
    }

    const { client, bucket, publicBaseUrl } = getConfig();
    const safeToken = input.token.replace(/[^a-z0-9]/gi, "").slice(0, 16);
    const version = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const key = `onboarding/${safeToken}/fotos/negocio-${version}.webp`;

    const body = await sharp(Buffer.from(await input.file.arrayBuffer()))
      .rotate()
      .webp({ quality: 84 })
      .toBuffer();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/webp",
          CacheControl: HERO_CACHE_CONTROL
        })
      );
    } catch (error) {
      throw normalizeR2UploadError(error);
    }

    return { token: input.token, key, url: `${publicBaseUrl}/${key}`, bytes: body.byteLength };
  }
};
