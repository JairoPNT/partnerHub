import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import { publicationJobService } from "@/server/services/publicationJobService";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ jobId: string }> };
const jobIdSchema = z.string().regex(/^[0-9a-f]{64}$/);

export async function GET(request: Request, context: RouteContext) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const { jobId } = await context.params;
    const job = await publicationJobService.get(jobIdSchema.parse(jobId));
    return job
      ? NextResponse.json({ job: publicationJobService.toSafeJob(job) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
      : NextResponse.json({ error: "PUBLICATION_JOB_NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_PUBLICATION_JOB_ID" }, { status: 400 });
    return NextResponse.json({ error: "PUBLICATION_JOB_READ_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await authenticateCloudflareAccessRequest(request);
    const { jobId } = await context.params;
    const job = await publicationJobService.cancel(jobIdSchema.parse(jobId));
    return NextResponse.json({ job: publicationJobService.toSafeJob(job) });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "INVALID_PUBLICATION_JOB_ID" }, { status: 400 });
    if (error instanceof Error && error.message === "PUBLICATION_JOB_NOT_FOUND") return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && ["PUBLICATION_JOB_CANCEL_INVALID", "PUBLICATION_JOB_ACTIVE"].includes(error.message)) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "PUBLICATION_JOB_CANCEL_FAILED" }, { status: 500 });
  }
}
