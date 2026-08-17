import { NextResponse } from "next/server";

import { wompiIntentStatusQuerySchema } from "@/server/services/wompiIntentStatusCore";
import { wompiSandboxService } from "@/server/services/wompiSandboxService";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = wompiIntentStatusQuerySchema.parse({
      activationLeadId: params.get("activationLeadId") ?? undefined,
      reference: params.get("reference") ?? undefined,
      intentId: params.get("intentId") ?? undefined
    });
    const status = await wompiSandboxService.getIntentStatus(query);
    if (!status) {
      return NextResponse.json({ error: "WOMPI_INTENT_NOT_FOUND" }, { status: 404, headers: noStoreHeaders });
    }
    return NextResponse.json(status, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ error: "INVALID_WOMPI_INTENT_QUERY" }, { status: 400, headers: noStoreHeaders });
  }
}
