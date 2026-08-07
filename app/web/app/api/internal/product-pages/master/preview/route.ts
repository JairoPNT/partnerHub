import { NextResponse } from "next/server";

import { productPageReplicationService } from "@/server/services/productPageReplicationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await productPageReplicationService.publishMasterPreview(body), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish master preview.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
