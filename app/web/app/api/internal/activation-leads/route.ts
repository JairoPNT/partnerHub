import { NextResponse } from "next/server";

import {
  activationLeadService,
  internalActivationLeadCreateSchema
} from "@/server/services/activationLeadService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  return NextResponse.json({ leads: await activationLeadService.list({ includeArchived }) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(
      await activationLeadService.createInternal(internalActivationLeadCreateSchema.parse(body)),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create activation lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
