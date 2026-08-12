import { NextResponse } from "next/server";

import { wompiIntentInputSchema } from "@/server/services/wompiSandboxCore";
import { wompiSandboxService } from "@/server/services/wompiSandboxService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await wompiSandboxService.createIntent(wompiIntentInputSchema.parse(await request.json()));
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Wompi Sandbox payment intent.";
    const status = message.includes("configured") || message.includes("credentials") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
