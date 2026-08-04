import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { productPageHistoryService } from "@/server/services/productPageHistoryService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { siteId } = await context.params;
    const history = await productPageHistoryService.get(siteId);

    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page history request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to read product page history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
