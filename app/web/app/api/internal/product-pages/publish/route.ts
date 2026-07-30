import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPagePublicationInputSchema,
  productPagePublicationService
} from "@/server/services/productPagePublicationService";
import { activationLeadService } from "@/server/services/activationLeadService";
import { productPageGenerationService } from "@/server/services/productPageGenerationService";
import { productPageLeadSyncService } from "@/server/services/productPageLeadSyncService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = productPagePublicationInputSchema.parse(body);
    const linkedLead = await activationLeadService.getBySiteId(input.siteId);

    if (linkedLead) {
      await productPageLeadSyncService.syncLeadToExistingSource(linkedLead);
    }

    await productPageGenerationService.regenerateFromSavedSource(input.siteId);

    const result = await productPagePublicationService.publish(input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page publication request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to publish product page package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
