import { NextResponse } from "next/server";

import { wompiSandboxService } from "@/server/services/wompiSandboxService";
import {
  classifyWebhookFailure,
  safeWebhookIdentifiers,
  webhookSuccessObservation
} from "@/server/services/wompiWebhookObservabilityCore";
import { wompiWebhookObservabilityService } from "@/server/services/wompiWebhookObservabilityService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  let rawEvent: unknown;
  try {
    rawEvent = await request.json();
    const result = await wompiSandboxService.processEvent(rawEvent, request.headers.get("x-event-checksum"));
    await wompiWebhookObservabilityService.record(webhookSuccessObservation({
      timestamp,
      ...result.observation,
      status: result.status,
      duplicate: result.duplicate
    }));
    const { observation: _observation, ...publicResult } = result;
    return NextResponse.json(publicResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Wompi event.";
    const status = message.includes("configured") || message.includes("credentials") ? 503 : 400;
    const failure = classifyWebhookFailure(error);
    const identifiers = safeWebhookIdentifiers(rawEvent);
    const intentObservation = identifiers.reference
      ? await wompiSandboxService.findIntentObservation(identifiers.reference).catch(() => ({}))
      : {};
    await wompiWebhookObservabilityService.record({
      timestamp,
      ...identifiers,
      ...intentObservation,
      httpStatus: status,
      stage: failure.stage,
      outcome: "REJECTED",
      reason: failure.reason
    });
    return NextResponse.json({ error: message }, { status });
  }
}
