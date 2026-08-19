import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { complimentaryEcosystemGrantService } from "@/server/services/complimentaryEcosystemGrantService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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
