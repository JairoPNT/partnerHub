import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { partnerEcosystemEntitlementService } from "@/server/services/partnerEcosystemEntitlementService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const search = new URL(request.url).searchParams;
    const result = await partnerEcosystemEntitlementService.get({
      activationLeadId: search.get("activationLeadId") || undefined,
      siteId: search.get("siteId") || undefined
    });
    return result
      ? NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } })
      : NextResponse.json({ error: "PARTNER_ENTITLEMENT_NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_PARTNER_ENTITLEMENT_QUERY" }, { status: 400 });
    }
    return NextResponse.json({ error: "PARTNER_ENTITLEMENT_FAILED" }, { status: 500 });
  }
}
