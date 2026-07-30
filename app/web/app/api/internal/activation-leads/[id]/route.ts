import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  activationLeadService,
  activationLeadRecordStateSchema,
  linkActivationLeadSchema,
  updateActivationLeadSchema
} from "@/server/services/activationLeadService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if ("recordState" in body) {
      return NextResponse.json(
        await activationLeadService.updateRecordState(id, activationLeadRecordStateSchema.parse(body.recordState))
      );
    }

    if ("siteId" in body) {
      return NextResponse.json(
        await activationLeadService.linkSite(id, linkActivationLeadSchema.parse(body))
      );
    }

    return NextResponse.json(
      await activationLeadService.updateStatus(id, updateActivationLeadSchema.parse(body))
    );
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
    return NextResponse.json(await activationLeadService.deleteTest(id, body.confirm));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete activation lead.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
