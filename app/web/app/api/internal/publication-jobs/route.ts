import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  authenticateCloudflareAccessPublicationRequest,
  CloudflareAccessAuthError
} from "@/server/auth/cloudflareAccessAuth";
import {
  publicationJobCreateInputSchema,
  publicationJobService
} from "@/server/services/publicationJobService";
import { wakePublicationJobWorker } from "@/server/services/publicationJobWorkerService";

export const runtime = "nodejs";

const querySchema = z.object({
  siteId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]).optional()
});

function serviceError(error: unknown) {
  const code = error instanceof Error && /^[A-Z0-9_:-]+$/.test(error.message)
    ? error.message
    : "PUBLICATION_JOB_OPERATION_FAILED";
  if (code === "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING") return NextResponse.json({ error: code }, { status: 404 });
  if (code.includes("INVALID") || code.includes("MISMATCH") || code.includes("CONFLICT")) return NextResponse.json({ error: code }, { status: 409 });
  return NextResponse.json({ error: code }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await authenticateCloudflareAccessPublicationRequest(request);
    const url = new URL(request.url);
    const filters = querySchema.parse({ siteId: url.searchParams.get("siteId") ?? undefined, status: url.searchParams.get("status") ?? undefined });
    const jobs = await publicationJobService.list(filters);
    return NextResponse.json({ jobs: jobs.map(publicationJobService.toSafeJob) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_PUBLICATION_JOB_QUERY" }, { status: 400 });
    return serviceError(error);
  }
}

export async function POST(request: Request) {
  try {
    const operator = await authenticateCloudflareAccessPublicationRequest(request);
    const input = publicationJobCreateInputSchema.parse(await request.json());
    const result = await publicationJobService.enqueue(input, operator.subject);
    void wakePublicationJobWorker();
    return NextResponse.json({ job: publicationJobService.toSafeJob(result.job), idempotent: !result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthError) return NextResponse.json({ error: error.code }, { status: 401 });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_PUBLICATION_JOB_REQUEST" }, { status: 400 });
    return serviceError(error);
  }
}
