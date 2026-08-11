import { NextResponse } from "next/server";

import {
  manualPaymentCreateSchema,
  paymentListFilterSchema
} from "@/server/services/manualPaymentLedgerCore";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const filters = paymentListFilterSchema.parse({
      activationLeadId: params.get("activationLeadId") ?? undefined,
      siteId: params.get("siteId") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      status: params.get("status") ?? undefined
    });
    return NextResponse.json(await manualPaymentLedgerService.list(filters));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payment filters." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const input = manualPaymentCreateSchema.parse(await request.json());
    const result = await manualPaymentLedgerService.create(input);
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create payment." }, { status: 400 });
  }
}
