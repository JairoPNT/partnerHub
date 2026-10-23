import {
  masterSitesBusinessCommandResultSchema,
  masterSitesBusinessReadResponseSchema,
  masterSitesErrorResponseSchema
} from "@/shared/master-sites-business-contract";
import type {
  MasterSitesBusinessCommandResult,
  MasterSitesBusinessReadResponse
} from "@/shared/master-sites-business-contract";
import type { BusinessCommand } from "./master-sites-business-delivery-model";

const ROOT = "/api/internal/master-sites/business";

export class BusinessDeliveryHttpError extends Error {
  readonly status: number;
  readonly reasons: string[];
  constructor(status: number, reasons: string[] = []) {
    super(status === 401 ? "La sesión venció. Inicia sesión y vuelve a abrir Negocio."
      : status === 403 ? "Acceso denegado. Esta entrega requiere autorización administrativa."
      : status === 409 ? "La revisión cambió o existe otra operación activa. Actualiza los datos antes de decidir."
      : status === 404 ? "El partner ya no está disponible. Actualiza la lista."
      : status === 400 ? "La solicitud no es válida. Actualiza los datos e inténtalo de nuevo."
      : "La respuesta del servidor no fue válida. Actualiza e inténtalo de nuevo.");
    this.name = "BusinessDeliveryHttpError";
    this.status = status;
    this.reasons = reasons;
  }
}

export class BusinessDeliveryUncertainError extends Error {
  constructor() {
    super("No llegó una respuesta confiable. El servidor pudo haber aceptado la operación; reintenta solo con el mismo identificador.");
    this.name = "BusinessDeliveryUncertainError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new BusinessDeliveryHttpError(response.status);
  }
  try { return await response.json(); }
  catch { throw new BusinessDeliveryHttpError(response.status); }
}

function assertResponse(response: Response, value: unknown): void {
  if (response.ok) return;
  const parsed = masterSitesErrorResponseSchema.safeParse(value);
  throw new BusinessDeliveryHttpError(response.status, parsed.success ? parsed.data.blockedReasons ?? [] : []);
}

export async function fetchBusinessRead(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<MasterSitesBusinessReadResponse> {
  const response = await fetcher(ROOT, { signal, cache: "no-store" });
  const value = await readJson(response);
  assertResponse(response, value);
  const parsed = masterSitesBusinessReadResponseSchema.safeParse(value);
  if (!parsed.success) throw new BusinessDeliveryHttpError(response.status);
  return parsed.data;
}

export async function sendBusinessCommand(command: BusinessCommand, fetcher: typeof fetch = fetch): Promise<MasterSitesBusinessCommandResult> {
  const endpoint = command.action === "prepare" ? "prepare-target" : "publish";
  const response = await fetcher(`${ROOT}/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command.body)
  });
  if (response.status >= 500) throw new BusinessDeliveryUncertainError();
  let value: unknown;
  try { value = await readJson(response); }
  catch {
    if ([400, 401, 403, 404, 409].includes(response.status)) throw new BusinessDeliveryHttpError(response.status);
    throw new BusinessDeliveryUncertainError();
  }
  assertResponse(response, value);
  const parsed = masterSitesBusinessCommandResultSchema.safeParse(value);
  if (!parsed.success) throw new BusinessDeliveryUncertainError();
  return parsed.data;
}
