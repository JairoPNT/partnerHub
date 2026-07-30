import { NextResponse } from "next/server";

import { activationLeadService } from "@/server/services/activationLeadService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  return NextResponse.json({ leads: await activationLeadService.list({ includeArchived }) });
}
