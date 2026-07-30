import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPageVerificationInputSchema,
  productPageVerificationService
} from "@/server/services/productPageVerificationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = productPageVerificationInputSchema.parse(body);
    const result = await productPageVerificationService.verify(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page verification request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to verify product page publication.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
