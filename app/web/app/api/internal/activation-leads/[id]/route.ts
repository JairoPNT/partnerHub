import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  activationLeadService,
  activationLeadRecordStateSchema,
  linkActivationLeadSchema,
  updateActivationLeadSchema
} from "@/server/services/activationLeadService";
import { productPageLeadSyncService } from "@/server/services/productPageLeadSyncService";
import { publicationEventEnqueueService } from "@/server/services/publicationEventEnqueueService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function trySyncLeadToProductPageSource(lead: Parameters<typeof productPageLeadSyncService.syncLeadToExistingSource>[0]) {
  try {
    await productPageLeadSyncService.syncLeadToExistingSource(lead);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Product page source sync failed.";
  }
}

function sourceSyncFailedAutomation() {
  return {
    event: "ACTIVATION_CHANGED" as const,
    outcome: "SKIPPED" as const,
    eligibleCount: 0,
    createdCount: 0,
    idempotentCount: 0,
    skippedCount: 0,
    reason: "SOURCE_SYNC_FAILED" as const
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if ("recordState" in body) {
      const lead = await activationLeadService.updateRecordState(id, activationLeadRecordStateSchema.parse(body.recordState));
      const publicationAutomation = await publicationEventEnqueueService.afterActivationChange(lead);
      return NextResponse.json({ ...lead, publicationAutomation });
    }

    if ("siteId" in body) {
      const result = await activationLeadService.linkSite(id, linkActivationLeadSchema.parse(body));
      const syncWarning = await trySyncLeadToProductPageSource(result.lead);
      const publicationAutomation = syncWarning
        ? sourceSyncFailedAutomation()
        : await publicationEventEnqueueService.afterActivationChange(result.lead);
      return NextResponse.json(syncWarning ? { ...result, syncWarning, publicationAutomation } : { ...result, publicationAutomation });
    }

    const lead = await activationLeadService.updateStatus(id, updateActivationLeadSchema.parse(body));
    const syncWarning = await trySyncLeadToProductPageSource(lead);
    const publicationAutomation = syncWarning
      ? sourceSyncFailedAutomation()
      : await publicationEventEnqueueService.afterActivationChange(lead);
    return NextResponse.json(syncWarning ? { ...lead, syncWarning, publicationAutomation } : { ...lead, publicationAutomation });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid activation lead update", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update activation lead.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return NextResponse.json(await activationLeadService.deleteTest(id, body.confirmation ?? body.confirm));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete activation lead.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
