import { NextResponse } from "next/server";
import { mediaUploadService } from "@/server/services/mediaUploadService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File | null;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "El token de onboarding es requerido." }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió un archivo de imagen válido." }, { status: 400 });
    }

    const uploaded = await mediaUploadService.uploadSourcePhoto({ token, file });
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la fotografía de negocio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
