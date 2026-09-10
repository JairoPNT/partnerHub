import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  authenticateCloudflareAccessPublicationRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import {
  publicationBackfillApplyInputSchema,
  publicationBackfillExecutorService
} from "@/server/services/publicationBackfillExecutorService";

export const runtime = "nodejs";

function operationError(error: unknown) {
  const code = error instanceof Error && /^[A-Z0-9_:-]+$/.test(error.message)
    ? error.message
    : "PUBLICATION_BACKFILL_OPERATION_FAILED";
  if (code.includes("MISMATCH") || code.includes("INVALID")) {
    return NextResponse.json({ error: code }, { status: 409 });
  }
  return NextResponse.json({ error: code }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const operator = await authenticateCloudflareAccessPublicationRequest(request);
    const input = publicationBackfillApplyInputSchema.parse(await request.json());
    const result = await publicationBackfillExecutorService.apply(input, operator.subject);
    return NextResponse.json(result, { status: result.blocked ? 409 : result.changed ? 201 : 200 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "INVALID_PUBLICATION_BACKFILL_REQUEST" }, { status: 400 });
    }
    return operationError(error);
  }
}
