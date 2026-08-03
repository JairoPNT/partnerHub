import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ siteId: string; assetPath?: string[] }> };

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

const ADMIN_APP_ORIGIN = "https://app.partnerhub.club";
const INTERNAL_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "::", "localhost"]);

function getPublicOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host) {
    const hostname = host.split(":")[0].toLowerCase();

    if (!INTERNAL_HOSTS.has(hostname)) {
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const protocol = forwardedProto === "http" ? "http" : "https";
      return `${protocol}://${host}`;
    }
  }

  return ADMIN_APP_ORIGIN;
}

function getOutputRoot() {
  return process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites";
}

function resolvePreviewFile(siteId: string, assetPath?: string[]) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = resolve(getOutputRoot(), safeSiteId);
  const relativeAsset = assetPath?.length ? assetPath.join("/") : "index.html";
  const target = resolve(root, relativeAsset);

  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error("Preview path escaped the generated package directory.");
  }

  return target;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { siteId, assetPath } = await context.params;
    const url = new URL(_request.url);

    // Si se accede a la raíz del sitio de vista previa sin la barra final (ej. /preview/jairo-pinto),
    // se redirige a /preview/jairo-pinto/ para que las rutas relativas de CSS/JS/Imágenes funcionen adecuadamente.
    if ((!assetPath || assetPath.length === 0) && !url.pathname.endsWith("/")) {
      return NextResponse.redirect(new URL(`${url.pathname}/${url.search}`, getPublicOrigin(_request)), 308);
    }

    const filePath = resolvePreviewFile(siteId, assetPath);
    const body = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview file not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
