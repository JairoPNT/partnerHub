import { NextResponse } from "next/server";

import { productPageReplicationService } from "@/server/services/productPageReplicationService";

export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await productPageReplicationService.publishMasterPreview(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish master preview.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
