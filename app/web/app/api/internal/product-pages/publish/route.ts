import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPagePublicationInputSchema,
  productPagePublicationService
} from "@/server/services/productPagePublicationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = productPagePublicationInputSchema.parse(body);
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
