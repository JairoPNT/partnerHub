import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  activationLeadSchema,
  activationLeadService
} from "@/server/services/activationLeadService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lead = await activationLeadService.create(activationLeadSchema.parse(body));
    return NextResponse.json({ leadId: lead.id, receivedAt: lead.createdAt }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid activation request", issues: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to save activation request." }, { status: 500 });
  }
}
