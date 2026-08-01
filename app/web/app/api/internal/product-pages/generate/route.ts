import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPageGenerationInputSchema,
  productPageGenerationService
} from "@/server/services/productPageGenerationService";

export const runtime = "nodejs";

const ADMIN_APP_ORIGIN = "https://app.partnerhub.club";
const INTERNAL_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "::", "localhost"]);

function getConfiguredOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;

  if (!configuredOrigin) return null;

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return null;
  }
}

function getPublicOrigin(request: Request) {
  const configuredOrigin = getConfiguredOrigin();
  const candidates = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    configuredOrigin ? new URL(configuredOrigin).host : null
  ];

  const publicHost = candidates.find((candidate) => {
    if (!candidate) return false;

    const hostname = candidate.split(":")[0].toLowerCase();
    return !INTERNAL_HOSTS.has(hostname);
  });

  if (!publicHost) {
    return configuredOrigin || ADMIN_APP_ORIGIN;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto === "http" ? "http" : "https";
  return `${protocol}://${publicHost}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = productPageGenerationInputSchema.parse(body);
    const result = await productPageGenerationService.generate(input);
    const previewUrl = new URL(result.previewUrl, getPublicOrigin(request)).toString();

    return NextResponse.json({ ...result, previewUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page generation request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to generate product page package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
