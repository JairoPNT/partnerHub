import { NextResponse } from "next/server";

import { dashboardMetricsPeriodSchema } from "@/server/services/dashboardFinancialMetricsCore";
import { dashboardMetricsService } from "@/server/services/dashboardMetricsService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const period = dashboardMetricsPeriodSchema.parse({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined
    });
    return NextResponse.json(await dashboardMetricsService.get(period));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid dashboard metrics period." },
      { status: 400 }
    );
  }
}
