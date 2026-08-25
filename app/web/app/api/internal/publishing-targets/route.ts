import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";

import { createHostingerDnsClient } from "@/server/integrations/hostingerDnsClient";
import {
  createHostingerSubdomainClient,
  getHostingerSubdomainConfig
} from "@/server/integrations/hostingerSubdomainClient";
import {
  safeProvisioningError,
  toSafePublishingTarget,
  withServerProvisioningIpv4
} from "@/server/services/provisioningApiContract";
import {
  createSubdomainProvisioningService,
  provisionSubdomainInputSchema
} from "@/server/services/subdomainProvisioningService";

export const runtime = "nodejs";

function requiredSecret(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required provisioning configuration: ${name}.`);
  return value;
}

function service() {
  return createSubdomainProvisioningService({
    hostingerClient: createHostingerSubdomainClient(getHostingerSubdomainConfig()),
    dnsClient: createHostingerDnsClient({
      apiToken: requiredSecret("HOSTINGER_API_TOKEN"),
      baseUrl: process.env.HOSTINGER_API_BASE_URL
    })
  });
}

export async function GET(request: Request) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const siteId = new URL(request.url).searchParams.get("siteId");
    const targets = siteId ? [await service().get(siteId)].filter(Boolean) : await service().list();
    return NextResponse.json({ targets: targets.map((target) => toSafePublishingTarget(target!)) });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_PROVISIONING_REQUEST" }, { status: 400 });
    }
    const safe = safeProvisioningError(error);
    return NextResponse.json({ error: safe.code }, { status: safe.status });
  }
}

export async function POST(request: Request) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const parsed = provisionSubdomainInputSchema.parse(
      withServerProvisioningIpv4(
        await request.json(),
        requiredSecret("PARTNERHUB_PROVISIONING_IPV4")
      )
    );
    const target = await service().provision(parsed);
    return NextResponse.json({ target: toSafePublishingTarget(target) }, { status: 200 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "INVALID_PROVISIONING_REQUEST" }, { status: 400 });
    }
    const safe = safeProvisioningError(error);
    return NextResponse.json({ error: safe.code }, { status: safe.status });
  }
}
