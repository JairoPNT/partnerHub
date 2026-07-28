import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  manualReferralService,
  updateReferralSchema
} from "@/server/services/manualReferralService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = updateReferralSchema.parse(await request.json());
    return NextResponse.json(await manualReferralService.updateStatus(id, body.status));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid referral status", issues: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to update referral.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
