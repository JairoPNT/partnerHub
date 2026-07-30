import { NextResponse } from "next/server";

import { mediaUploadService } from "@/server/services/mediaUploadService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const siteId = formData.get("siteId");
    const variant = formData.get("variant");

    if (!(file instanceof File) || typeof siteId !== "string" || typeof variant !== "string") {
      return NextResponse.json({ error: "file, siteId and variant are required." }, { status: 400 });
    }

    return NextResponse.json(
      await mediaUploadService.uploadHero({ siteId, variant, file }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload hero image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
