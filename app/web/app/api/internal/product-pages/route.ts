import { NextResponse } from "next/server";

import { productPageSourceService } from "@/server/services/productPageSourceService";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ sites: await productPageSourceService.list() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list product pages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
