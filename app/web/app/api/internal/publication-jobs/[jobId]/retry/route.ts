import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateCloudflareAccessPublicationRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { publicationJobService } from "@/server/services/publicationJobService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };
const jobIdSchema = z.string().regex(/^[0-9a-f]{64}$/);

export async function POST(request: Request, context: RouteContext) {
  try {
    await authenticateCloudflareAccessPublicationRequest(request);
    const { jobId } = await context.params;
    const job = await publicationJobService.retry(jobIdSchema.parse(jobId));
    return NextResponse.json({ job: publicationJobService.toSafeJob(job) });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_PUBLICATION_JOB_ID" }, { status: 400 });
    if (error instanceof Error && error.message === "PUBLICATION_JOB_NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && ["PUBLICATION_JOB_RETRY_INVALID", "PUBLICATION_JOB_ACTIVE"].includes(error.message)) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "PUBLICATION_JOB_RETRY_FAILED" }, { status: 500 });
  }
}
