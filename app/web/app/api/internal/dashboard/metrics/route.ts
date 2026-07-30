import { NextResponse } from "next/server";

import { dashboardMetricsService } from "@/server/services/dashboardMetricsService";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await dashboardMetricsService.get());
}
