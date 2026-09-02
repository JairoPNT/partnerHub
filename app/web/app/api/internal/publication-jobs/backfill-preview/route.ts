import { NextResponse } from "next/server";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { publicationBackfillPreviewService } from "@/server/services/publicationBackfillPreviewService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const preview = await publicationBackfillPreviewService.preview();
    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    return NextResponse.json({ error: "PUBLICATION_BACKFILL_PREVIEW_FAILED" }, { status: 500 });
  }
}
