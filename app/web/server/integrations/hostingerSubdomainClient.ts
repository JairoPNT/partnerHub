import { z } from "zod";

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

const subdomainLabelSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

const usernameSchema = z.string().trim().regex(/^u[0-9]+$/);

const subdomainResourceSchema = z.object({
  username: z.string(),
  domain: hostnameSchema,
  parent_domain: hostnameSchema,
  root_directory: z.string().min(1),
  subdomain: subdomainLabelSchema
});

const subdomainCollectionSchema = z.array(subdomainResourceSchema);

const websiteResourceSchema = z.object({
  username: z.string(),
  domain: hostnameSchema,
  root_directory: z.string().min(1)
}).passthrough();

const providerErrorSchema = z.object({
  error: z.union([z.string(), z.record(z.unknown())]).optional(),
  correlation_id: z.string().optional()
});

export type HostingerSubdomain = z.infer<typeof subdomainResourceSchema>;
export type HostingerWebsite = z.infer<typeof websiteResourceSchema>;

export type HostingerEnsureSubdomainResult = {
  state: "EXISTING" | "CREATED";
  subdomain: HostingerSubdomain;
};

export type HostingerSubdomainClientConfig = {
  apiToken: string;
  username: string;
  baseUrl?: string;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class HostingerApiError extends Error {
  public readonly code:
    | "HOSTINGER_AUTH_FAILED"
    | "HOSTINGER_RATE_LIMITED"
    | "HOSTINGER_VALIDATION_FAILED"
    | "HOSTINGER_PROVIDER_ERROR"
    | "HOSTINGER_INVALID_RESPONSE"
    | "HOSTINGER_SUBDOMAIN_CONFLICT";
  public readonly status: number | null;
  public readonly correlationId?: string;

  constructor(
    code:
      | "HOSTINGER_AUTH_FAILED"
      | "HOSTINGER_RATE_LIMITED"
      | "HOSTINGER_VALIDATION_FAILED"
      | "HOSTINGER_PROVIDER_ERROR"
      | "HOSTINGER_INVALID_RESPONSE"
      | "HOSTINGER_SUBDOMAIN_CONFLICT",
    message: string,
    status: number | null = null,
    correlationId?: string
  ) {
    super(message);
    this.name = "HostingerApiError";
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
  }
}

function normalizeBaseUrl(value?: string) {
  const parsed = new URL(value?.trim() || "https://developers.hostinger.com");
  if (parsed.protocol !== "https:") throw new Error("HOSTINGER_API_BASE_URL must use HTTPS.");
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
  const parsed = providerErrorSchema.safeParse(await safeJson(response));
  const correlationId = parsed.success ? parsed.data.correlation_id : undefined;

  if (response.status === 401 || response.status === 403) {
    throw new HostingerApiError(
      "HOSTINGER_AUTH_FAILED",
      "Hostinger rejected the configured API token.",
      response.status,
      correlationId
    );
  }

  if (response.status === 429) {
    throw new HostingerApiError(
      "HOSTINGER_RATE_LIMITED",
      "Hostinger API rate limit was reached.",
      response.status,
      correlationId
    );
  }

  if (response.status === 422) {
    throw new HostingerApiError(
      "HOSTINGER_VALIDATION_FAILED",
      "Hostinger rejected the subdomain request.",
      response.status,
      correlationId
    );
  }

  throw new HostingerApiError(
    "HOSTINGER_PROVIDER_ERROR",
    "Hostinger API could not complete the subdomain request.",
    response.status,
    correlationId
  );
}

export function getHostingerSubdomainConfig(
  source: NodeJS.ProcessEnv = process.env
): HostingerSubdomainClientConfig {
  const apiToken = source.HOSTINGER_API_TOKEN?.trim();
  const username = source.HOSTINGER_API_USERNAME?.trim() || source.HOSTINGER_SFTP_USERNAME?.trim();

  if (!apiToken) throw new Error("Missing required Hostinger API configuration: HOSTINGER_API_TOKEN.");
  if (!username) {
    throw new Error(
      "Missing required Hostinger API configuration: HOSTINGER_API_USERNAME or HOSTINGER_SFTP_USERNAME."
    );
  }

  return {
    apiToken,
    username: usernameSchema.parse(username),
    baseUrl: normalizeBaseUrl(source.HOSTINGER_API_BASE_URL)
  };
}

export function createHostingerSubdomainClient(
  config: HostingerSubdomainClientConfig,
  fetchImplementation: FetchLike = fetch
) {
  const apiToken = z.string().trim().min(1).parse(config.apiToken);
  const username = usernameSchema.parse(config.username);
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  function endpoint(parentDomain: string) {
    const domain = hostnameSchema.parse(parentDomain);
    return `${baseUrl}/api/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/subdomains`;
  }

  function websiteEndpoint(parentDomain: string) {
    const domain = hostnameSchema.parse(parentDomain);
    return `${baseUrl}/api/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}`;
  }

  async function request(parentDomain: string, init?: RequestInit) {
    const response = await fetchImplementation(endpoint(parentDomain), {
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

  async function list(parentDomain: string): Promise<HostingerSubdomain[]> {
    const response = await request(parentDomain);
    const parsed = subdomainCollectionSchema.safeParse(await safeJson(response));
    if (!parsed.success) {
      throw new HostingerApiError(
        "HOSTINGER_INVALID_RESPONSE",
        "Hostinger returned an invalid subdomain collection.",
        response.status
      );
    }
    return parsed.data;
  }

  async function find(parentDomain: string, label: string) {
    const domain = hostnameSchema.parse(parentDomain);
    const subdomain = subdomainLabelSchema.parse(label);
    const publicHost = `${subdomain}.${domain}`;
    return (await list(domain)).find((item) => item.domain === publicHost) ?? null;
  }

  async function getWebsite(parentDomain: string): Promise<HostingerWebsite> {
    const response = await fetchImplementation(websiteEndpoint(parentDomain), {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiToken}` }
    });
    if (!response.ok) await throwProviderError(response);
    const parsed = websiteResourceSchema.safeParse(await safeJson(response));
    if (!parsed.success || parsed.data.username !== username || parsed.data.domain !== parentDomain) {
      throw new HostingerApiError(
        "HOSTINGER_INVALID_RESPONSE",
        "Hostinger returned an invalid website resource.",
        response.status
      );
    }
    return parsed.data;
  }

  function assertMatchingTarget(resource: HostingerSubdomain, parentDomain: string, label: string) {
    const publicHost = `${label}.${parentDomain}`;
    if (
      resource.username !== username ||
      resource.parent_domain !== parentDomain ||
      resource.subdomain !== label ||
      resource.domain !== publicHost
    ) {
      throw new HostingerApiError(
        "HOSTINGER_SUBDOMAIN_CONFLICT",
        `Hostinger already has ${publicHost} with a different owner, parent, or document root.`
      );
    }
  }

  async function ensure(parentDomain: string, label: string): Promise<HostingerEnsureSubdomainResult> {
    const domain = hostnameSchema.parse(parentDomain);
    const subdomain = subdomainLabelSchema.parse(label);
    const existing = await find(domain, subdomain);

    if (existing) {
      assertMatchingTarget(existing, domain, subdomain);
      return { state: "EXISTING", subdomain: existing };
    }

    await request(domain, {
      method: "POST",
      body: JSON.stringify({
        subdomain,
        directory: null,
        is_using_public_directory: false
      })
    });

    const created = await find(domain, subdomain);
    if (!created) {
      throw new HostingerApiError(
        "HOSTINGER_INVALID_RESPONSE",
        `Hostinger accepted creation of ${subdomain}.${domain} but did not return it afterwards.`
      );
    }

    assertMatchingTarget(created, domain, subdomain);
    return { state: "CREATED", subdomain: created };
  }

  return { ensure, find, getWebsite, list };
}
