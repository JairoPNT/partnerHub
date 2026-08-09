import { isIP } from "node:net";

import { z } from "zod";

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

const zoneIdSchema = z.string().trim().regex(/^[a-f0-9]{32}$/i);

const ipv4Schema = z.string().trim().refine((value) => isIP(value) === 4, "content must be IPv4");

const dnsRecordSchema = z.object({
  id: z.string().min(1),
  type: z.literal("A"),
  name: hostnameSchema,
  content: ipv4Schema,
  proxied: z.boolean(),
  ttl: z.number()
});

const providerDnsRecordSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: hostnameSchema,
  content: z.string().min(1),
  proxied: z.boolean().optional().default(false),
  ttl: z.number()
});

const listResponseSchema = z.object({
  success: z.literal(true),
  result: z.array(providerDnsRecordSchema)
});

const createResponseSchema = z.object({
  success: z.literal(true),
  result: dnsRecordSchema
});

const errorResponseSchema = z.object({
  success: z.boolean().optional(),
  errors: z
    .array(
      z.object({
        code: z.number().optional(),
        message: z.string().optional()
      })
    )
    .optional()
});

export type CloudflareDnsRecord = z.infer<typeof dnsRecordSchema>;

export type CloudflareEnsureDnsResult = {
  state: "EXISTING" | "CREATED";
  record: CloudflareDnsRecord;
};

export type CloudflareDnsClientConfig = {
  apiToken: string;
  zoneId: string;
  baseUrl?: string;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class CloudflareDnsError extends Error {
  public readonly code:
    | "CLOUDFLARE_AUTH_FAILED"
    | "CLOUDFLARE_RATE_LIMITED"
    | "CLOUDFLARE_VALIDATION_FAILED"
    | "CLOUDFLARE_PROVIDER_ERROR"
    | "CLOUDFLARE_INVALID_RESPONSE"
    | "CLOUDFLARE_DNS_CONFLICT";
  public readonly status: number | null;
  public readonly providerCode?: number;
  public readonly correlationId?: string;

  constructor(
    code:
      | "CLOUDFLARE_AUTH_FAILED"
      | "CLOUDFLARE_RATE_LIMITED"
      | "CLOUDFLARE_VALIDATION_FAILED"
      | "CLOUDFLARE_PROVIDER_ERROR"
      | "CLOUDFLARE_INVALID_RESPONSE"
      | "CLOUDFLARE_DNS_CONFLICT",
    message: string,
    status: number | null = null,
    providerCode?: number,
    correlationId?: string
  ) {
    super(message);
    this.name = "CloudflareDnsError";
    this.code = code;
    this.status = status;
    this.providerCode = providerCode;
    this.correlationId = correlationId;
  }
}

function normalizeBaseUrl(value?: string) {
  const parsed = new URL(value?.trim() || "https://api.cloudflare.com/client/v4");
  if (parsed.protocol !== "https:") throw new Error("CLOUDFLARE_API_BASE_URL must use HTTPS.");
  return parsed.toString().replace(/\/$/, "");
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function throwProviderError(response: Response): Promise<never> {
  const parsed = errorResponseSchema.safeParse(await safeJson(response));
  const providerCode = parsed.success ? parsed.data.errors?.[0]?.code : undefined;
  const correlationId = response.headers.get("cf-ray") ?? undefined;

  if (response.status === 401 || response.status === 403) {
    throw new CloudflareDnsError(
      "CLOUDFLARE_AUTH_FAILED",
      "Cloudflare rejected the configured DNS API token.",
      response.status,
      providerCode,
      correlationId
    );
  }

  if (response.status === 429) {
    throw new CloudflareDnsError(
      "CLOUDFLARE_RATE_LIMITED",
      "Cloudflare DNS API rate limit was reached.",
      response.status,
      providerCode,
      correlationId
    );
  }

  if (response.status === 400 || response.status === 422) {
    throw new CloudflareDnsError(
      "CLOUDFLARE_VALIDATION_FAILED",
      "Cloudflare rejected the DNS record request.",
      response.status,
      providerCode,
      correlationId
    );
  }

  throw new CloudflareDnsError(
    "CLOUDFLARE_PROVIDER_ERROR",
    "Cloudflare could not complete the DNS record request.",
    response.status,
    providerCode,
    correlationId
  );
}

export function getCloudflareDnsConfig(source: NodeJS.ProcessEnv = process.env): CloudflareDnsClientConfig {
  const apiToken = source.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = source.CLOUDFLARE_ZONE_ID?.trim();

  if (!apiToken) throw new Error("Missing required Cloudflare configuration: CLOUDFLARE_API_TOKEN.");
  if (!zoneId) throw new Error("Missing required Cloudflare configuration: CLOUDFLARE_ZONE_ID.");

  return {
    apiToken,
    zoneId: zoneIdSchema.parse(zoneId),
    baseUrl: normalizeBaseUrl(source.CLOUDFLARE_API_BASE_URL)
  };
}

export function createCloudflareDnsClient(
  config: CloudflareDnsClientConfig,
  fetchImplementation: FetchLike = fetch
) {
  const apiToken = z.string().trim().min(1).parse(config.apiToken);
  const zoneId = zoneIdSchema.parse(config.zoneId);
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const recordsUrl = `${baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records`;

  async function request(url: string, init?: RequestInit) {
    const response = await fetchImplementation(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers
      }
    });

    if (!response.ok) await throwProviderError(response);
    return response;
  }

  async function find(hostname: string) {
    const name = hostnameSchema.parse(hostname);
    const query = new URLSearchParams({ name });
    const response = await request(`${recordsUrl}?${query.toString()}`);
    const parsed = listResponseSchema.safeParse(await safeJson(response));
    if (!parsed.success) {
      throw new CloudflareDnsError(
        "CLOUDFLARE_INVALID_RESPONSE",
        "Cloudflare returned an invalid DNS record collection.",
        response.status
      );
    }
    return parsed.data.result;
  }

  async function ensureARecord(hostname: string, ipv4: string): Promise<CloudflareEnsureDnsResult> {
    const name = hostnameSchema.parse(hostname);
    const content = ipv4Schema.parse(ipv4);
    const existingRecords = await find(name);

    if (existingRecords.length > 1) {
      throw new CloudflareDnsError(
        "CLOUDFLARE_DNS_CONFLICT",
        `Cloudflare returned multiple A records for ${name}; no mutation was attempted.`
      );
    }

    const existing = existingRecords[0];
    if (existing) {
      const parsedExisting = dnsRecordSchema.safeParse(existing);
      if (!parsedExisting.success || parsedExisting.data.content !== content || parsedExisting.data.proxied) {
        throw new CloudflareDnsError(
          "CLOUDFLARE_DNS_CONFLICT",
          `Cloudflare already has a conflicting A record for ${name}; no mutation was attempted.`
        );
      }
      return { state: "EXISTING", record: parsedExisting.data };
    }

    const response = await request(recordsUrl, {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name,
        content,
        ttl: 1,
        proxied: false,
        comment: "Managed by PartnerHub"
      })
    });
    const parsed = createResponseSchema.safeParse(await safeJson(response));
    if (!parsed.success) {
      throw new CloudflareDnsError(
        "CLOUDFLARE_INVALID_RESPONSE",
        "Cloudflare returned an invalid created DNS record.",
        response.status
      );
    }

    if (parsed.data.result.name !== name || parsed.data.result.content !== content || parsed.data.result.proxied) {
      throw new CloudflareDnsError(
        "CLOUDFLARE_DNS_CONFLICT",
        `Cloudflare created a DNS record that does not match the requested target for ${name}.`
      );
    }

    return { state: "CREATED", record: parsed.data.result };
  }

  return { ensureARecord, find };
}
