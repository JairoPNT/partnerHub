import { NextResponse } from "next/server";

import { wompiSandboxService } from "@/server/services/wompiSandboxService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await wompiSandboxService.processEvent(
      await request.json(),
      request.headers.get("x-event-checksum")
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Wompi event.";
    const status = message.includes("configured") || message.includes("credentials") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
