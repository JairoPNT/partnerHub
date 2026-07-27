import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  productPageGenerationInputSchema,
  productPageGenerationService
} from "@/server/services/productPageGenerationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = productPageGenerationInputSchema.parse(body);
    const result = await productPageGenerationService.generate(input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid product page generation request", issues: error.flatten() },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to generate product page package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
