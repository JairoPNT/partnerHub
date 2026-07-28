import { NextResponse } from "next/server";

import { activationLeadService } from "@/server/services/activationLeadService";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ leads: await activationLeadService.list() });
}
