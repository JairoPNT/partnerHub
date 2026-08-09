import { NextResponse } from "next/server";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { domainInventoryService } from "@/server/services/domainInventoryService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authenticateCloudflareAccessRequest(request);
    return NextResponse.json({ domains: await domainInventoryService.list() });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) {
      return NextResponse.json({ error: error.code }, { status: 401 });
    }
    return NextResponse.json({ error: "DOMAIN_INVENTORY_FAILED" }, { status: 500 });
  }
}
