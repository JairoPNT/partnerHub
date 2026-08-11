import { NextResponse } from "next/server";

import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payment = await manualPaymentLedgerService.getById(id);
  if (!payment) return NextResponse.json({ error: `Payment ${id} was not found.` }, { status: 404 });
  return NextResponse.json({ payment });
}
