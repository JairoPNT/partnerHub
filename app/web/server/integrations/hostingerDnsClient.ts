import { isIP } from "node:net";

import { z } from "zod";

const hostnameSchema = z.string().trim().toLowerCase().regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/);
const ipv4Schema = z.string().trim().refine((value) => isIP(value) === 4);
const dnsRecordSchema = z.object({
  id: z.string().min(1),
  type: z.literal("A"),
  name: hostnameSchema,
  content: ipv4Schema,
  ttl: z.number().int().positive().optional()
}).passthrough();
const zoneEntrySchema = z.object({
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  ttl: z.number().int().positive().optional(),
  records: z.array(z.object({ content: z.string().trim().min(1), is_disabled: z.boolean().optional() }).passthrough())
}).passthrough();
const zoneSchema = z.array(zoneEntrySchema);

export type HostingerDnsRecord = z.infer<typeof dnsRecordSchema>;
export type HostingerEnsureDnsResult = { state: "EXISTING" | "CREATED"; record: HostingerDnsRecord };
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class HostingerDnsError extends Error {
  public readonly code: "HOSTINGER_DNS_AUTH_FAILED" | "HOSTINGER_DNS_CONFLICT" | "HOSTINGER_DNS_PROVIDER_FAILED" | "HOSTINGER_DNS_INVALID_RESPONSE";
  public readonly status: number | null;
  constructor(
    code: "HOSTINGER_DNS_AUTH_FAILED" | "HOSTINGER_DNS_CONFLICT" | "HOSTINGER_DNS_PROVIDER_FAILED" | "HOSTINGER_DNS_INVALID_RESPONSE",
    message: string,
    status: number | null = null
  ) {
    super(message);
    this.name = "HostingerDnsError";
    this.code = code;
    this.status = status;
  }
}

function baseUrl(value?: string) {
  const parsed = new URL(value?.trim() || "https://developers.hostinger.com");
  if (parsed.protocol !== "https:") throw new Error("HOSTINGER_API_BASE_URL must use HTTPS.");
  return parsed.toString().replace(/\/$/, "");
}

async function json(response: Response) {
  try { return await response.json(); } catch { return null; }
}

export function createHostingerDnsClient(
  config: { apiToken: string; baseUrl?: string },
  fetchImplementation: FetchLike = fetch
) {
  const token = z.string().trim().min(1).parse(config.apiToken);
  const root = baseUrl(config.baseUrl);

  async function request(zone: string, init?: RequestInit) {
    const domain = hostnameSchema.parse(zone);
    const response = await fetchImplementation(`${root}/api/dns/v1/zones/${encodeURIComponent(domain)}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers
      }
    });
    if (response.status === 401 || response.status === 403) {
      throw new HostingerDnsError("HOSTINGER_DNS_AUTH_FAILED", "Hostinger rejected the DNS API token.", response.status);
    }
    if (!response.ok) throw new HostingerDnsError("HOSTINGER_DNS_PROVIDER_FAILED", "Hostinger DNS request failed.", response.status);
    return response;
  }

  async function list(zone: string) {
    const response = await request(zone);
    const domain = hostnameSchema.parse(zone);
    const parsed = zoneSchema.safeParse(await json(response));
    if (!parsed.success) throw new HostingerDnsError("HOSTINGER_DNS_INVALID_RESPONSE", "Hostinger returned invalid DNS records.", response.status);
    const records: HostingerDnsRecord[] = [];
    for (const entry of parsed.data) {
      if (entry.type !== "A") continue;
      const fqdn = entry.name === "@" ? domain : entry.name.endsWith(`.${domain}`) ? entry.name : `${entry.name}.${domain}`;
      for (const record of entry.records) {
        if (record.is_disabled) continue;
        const candidate = dnsRecordSchema.safeParse({ id: `hostinger-zone:${domain}:${fqdn}:A`, type: "A", name: fqdn, content: record.content, ttl: entry.ttl });
        if (!candidate.success) throw new HostingerDnsError("HOSTINGER_DNS_INVALID_RESPONSE", "Hostinger returned an invalid A record.", response.status);
        records.push(candidate.data);
      }
    }
    return records;
  }

  async function ensureARecord(zone: string, hostname: string, ipv4: string): Promise<HostingerEnsureDnsResult> {
    const domain = hostnameSchema.parse(zone);
    const name = hostnameSchema.parse(hostname);
    const content = ipv4Schema.parse(ipv4);
    if (name !== domain && !name.endsWith(`.${domain}`)) throw new HostingerDnsError("HOSTINGER_DNS_CONFLICT", "DNS hostname is outside the requested zone.");
    const matches = (await list(domain)).filter((record) => record.type === "A" && record.name === name);
    if (matches.length > 1 || (matches[0] && matches[0].content !== content)) {
      throw new HostingerDnsError("HOSTINGER_DNS_CONFLICT", `Hostinger DNS has a conflicting A record for ${name}.`);
    }
    if (matches[0]) return { state: "EXISTING", record: matches[0] };
    const relativeName = name === domain ? "@" : name.slice(0, -(domain.length + 1));
    await request(domain, { method: "PUT", body: JSON.stringify({ overwrite: false, zone: [{ type: "A", name: relativeName, records: [{ content }], ttl: 300 }] }) });
    const created = (await list(domain)).filter((record) => record.type === "A" && record.name === name && record.content === content);
    if (created.length !== 1) throw new HostingerDnsError("HOSTINGER_DNS_INVALID_RESPONSE", "Hostinger DNS write was not confirmed by readback.");
    return { state: "CREATED", record: created[0] };
  }

  return { ensureARecord, list };
}
