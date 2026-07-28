import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  assignReferralCodeSchema,
  createReferralSchema,
  manualReferralService
} from "@/server/services/manualReferralService";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await manualReferralService.list());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = "code" in body
      ? await manualReferralService.assignCode(assignReferralCodeSchema.parse(body))
      : await manualReferralService.createReferral(createReferralSchema.parse(body));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid referral request", issues: error.flatten() }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to save referral.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
