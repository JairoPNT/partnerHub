import { NextResponse } from "next/server";

import { paymentVoidSchema } from "@/server/services/manualPaymentLedgerCore";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { reason } = paymentVoidSchema.parse(await request.json());
    const result = await manualPaymentLedgerService.voidById(id, reason);
    if (!result) return NextResponse.json({ error: `Payment ${id} was not found.` }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to void payment." }, { status: 400 });
  }
}
