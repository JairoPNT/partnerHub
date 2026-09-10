import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPageGenerationInputSchema,
  productPageGenerationService
} from "@/server/services/productPageGenerationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { publicationEventEnqueueService } from "@/server/services/publicationEventEnqueueService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { siteId } = await context.params;
  const configuration = await productPageSourceService.get(siteId);

  if (!configuration) {
    return NextResponse.json({ error: `No saved configuration exists for ${siteId}.` }, { status: 404 });
  }

  return NextResponse.json({ siteId, configuration });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { siteId } = await context.params;
    const body = await request.json();
    const input = productPageGenerationInputSchema.parse({ ...body, site: { ...body.site, id: siteId } });
    const result = await productPageGenerationService.generate(input);
    const publicationAutomation = await publicationEventEnqueueService.afterSourceChange(result.siteId);

    return NextResponse.json({ ...result, requiresPublication: publicationAutomation.outcome === "SKIPPED" || publicationAutomation.outcome === "FAILED_SAFE", publicationAutomation }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page update request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update product page package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
