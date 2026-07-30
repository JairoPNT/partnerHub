import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPageReplicationInputSchema,
  productPageReplicationService
} from "@/server/services/productPageReplicationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await productPageReplicationService.replicate(productPageReplicationInputSchema.parse(body));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page replication request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to replicate product page template.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
