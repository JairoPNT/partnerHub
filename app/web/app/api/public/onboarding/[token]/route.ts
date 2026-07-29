import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  activationLeadService,
  onboardingDataSchema
} from "@/server/services/activationLeadService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await activationLeadService.getByOnboardingToken(token));
  } catch {
    return NextResponse.json({ error: "Onboarding link was not found or has expired." }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    return NextResponse.json(
      await activationLeadService.updateOnboarding(token, onboardingDataSchema.parse(body))
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid onboarding data", issues: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Onboarding link was not found or has expired." }, { status: 404 });
  }
}
