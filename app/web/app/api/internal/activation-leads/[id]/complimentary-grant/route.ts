import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { activationLeadService } from "@/server/services/activationLeadService";
import { complimentaryEcosystemGrantService } from "@/server/services/complimentaryEcosystemGrantService";
import { buildComplimentaryGrantReadback } from "@/server/services/complimentaryGrantReadbackCore";
import { partnerEcosystemEntitlementService } from "@/server/services/partnerEcosystemEntitlementService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function bogotaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const { id } = await context.params;
    const lead = await activationLeadService.getById(id);
    if (!lead) return NextResponse.json({ error: "ACTIVATION_LEAD_NOT_FOUND" }, { status: 404 });
    const [grants, entitlement] = await Promise.all([
      complimentaryEcosystemGrantService.listByLead(id),
      partnerEcosystemEntitlementService.get({ activationLeadId: id })
    ]);
    if (!entitlement) return NextResponse.json({ error: "PARTNER_ENTITLEMENT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(buildComplimentaryGrantReadback(id, grants, entitlement, bogotaDate()), {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    return NextResponse.json({ error: "COMPLIMENTARY_GRANT_READ_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const operator = await authenticateCloudflareAccessRequest(request);
    const { id } = await context.params;
    const result = await complimentaryEcosystemGrantService.create(id, await request.json(), operator);
    return result
      ? NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
      : NextResponse.json({ error: "ACTIVATION_LEAD_NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_COMPLIMENTARY_GRANT", issues: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "COMPLIMENTARY_GRANT_FAILED" }, { status: 500 });
  }
}
