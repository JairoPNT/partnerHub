import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { businessCommercialReadinessService } from "@/server/services/businessCommercialReadinessService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const { id } = await context.params;
    const readiness = await businessCommercialReadinessService.get({ activationLeadId: id });
    if (readiness.status === "NOT_FOUND") return NextResponse.json({ error: "ACTIVATION_LEAD_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(readiness, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_ACTIVATION_LEAD_ID" }, { status: 400 });
    return NextResponse.json({ error: "BUSINESS_COMMERCIAL_READINESS_FAILED" }, { status: 500 });
  }
}
