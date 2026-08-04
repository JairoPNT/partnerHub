import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deliveryNotificationService } from "@/server/services/deliveryNotificationService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(
      await deliveryNotificationService.prepareDeliveryNotification(id, body)
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid delivery notification request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error
      ? error.message
      : "Unable to prepare delivery notification.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
