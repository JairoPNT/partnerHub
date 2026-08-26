import { promises as dns } from "node:dns";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve, sep } from "node:path";

import { z } from "zod";

import type { HostingerDnsRoutingMode, HostingerEnsureDnsResult } from "../integrations/hostingerDnsClient.ts";
import type { HostingerEnsureSubdomainResult, HostingerWebsite } from "../integrations/hostingerSubdomainClient.ts";
import { getPartnerPublicHost, PARTNER_HOST_LABELS } from "#partner-hostname-contract";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const ownerKeySchema = z.string().uuid();
export const publishingEcosystemTypeSchema = z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
const hostnameSchema = z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
const ipv4Schema = z.string().trim().refine((value) => isIP(value) === 4, "ipv4 must be valid");
const stateSchema = z.enum(["PENDING", "HOSTING_CREATED", "DNS_PENDING", "SSL_PENDING", "READY", "FAILED"]);

const publishingTargetSchema = z.object({
  version: z.literal(2),
  ownerKey: ownerKeySchema,
  siteId: siteIdSchema,
  ecosystemType: publishingEcosystemTypeSchema,
  rootEcosystemType: publishingEcosystemTypeSchema,
  baseDomain: hostnameSchema,
  publicHost: hostnameSchema,
  remoteRoot: z.string().min(1).nullable(),
  provisioningState: stateSchema,
  hostingerState: z.enum(["PENDING", "READY"]),
  dnsState: z.enum(["PENDING", "CREATED", "RESOLVED"]),
  sslState: z.enum(["PENDING", "READY"]),
  publicationState: z.enum(["PENDING", "READY"]).default("PENDING"),
  dnsRecordId: z.string().min(1).optional(),
  lastErrorCode: z.string().min(1).optional(),
  lastCheckedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const legacyPublishingTargetSchema = z.object({
  version: z.literal(1),
  ownerKey: ownerKeySchema,
  siteId: siteIdSchema,
  ecosystemType: z.enum(["PRODUCT", "BUSINESS"]),
  baseDomain: hostnameSchema,
  publicHost: hostnameSchema,
  remoteRoot: z.string().min(1).nullable(),
  provisioningState: stateSchema,
  hostingerState: z.enum(["PENDING", "READY"]),
  dnsState: z.enum(["PENDING", "CREATED", "RESOLVED"]),
  sslState: z.enum(["PENDING", "READY"]),
  dnsRecordId: z.string().min(1).optional(),
  lastErrorCode: z.string().min(1).optional(),
  lastCheckedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type PublishingTarget = z.infer<typeof publishingTargetSchema>;
export type ProvisioningState = z.infer<typeof stateSchema>;
export const provisionSubdomainInputSchema = z.object({
  ownerKey: ownerKeySchema,
  siteId: siteIdSchema,
  ecosystemType: publishingEcosystemTypeSchema,
  rootEcosystemType: publishingEcosystemTypeSchema,
  baseDomain: hostnameSchema.refine((value) => value !== "ganomaster.pro" && !value.endsWith(".ganomaster.pro"), "Master domains cannot be provisioned"),
  ipv4: ipv4Schema,
  confirmation: z.literal("PROVISION_SUBDOMAIN")
});
export type ProvisionSubdomainInput = z.infer<typeof provisionSubdomainInputSchema>;

type HostingerClient = {
  ensure(parentDomain: string, label: string): Promise<HostingerEnsureSubdomainResult>;
  getWebsite?(parentDomain: string): Promise<HostingerWebsite>;
};
type DnsClient = { ensureARecord(zone: string, hostname: string, ipv4: string): Promise<HostingerEnsureDnsResult> };
type ReadinessProbe = {
  dnsResolves(hostname: string, ipv4: string, routingMode: HostingerDnsRoutingMode): Promise<boolean>;
  httpsReady(hostname: string, routingMode: HostingerDnsRoutingMode): Promise<boolean>;
};
type Dependencies = { hostingerClient: HostingerClient; dnsClient: DnsClient; readinessProbe?: ReadinessProbe; storageDirectory?: string; now?: () => Date };

export class ProvisioningError extends Error {
  public readonly code: "PROVISIONING_TARGET_CONFLICT" | "PROVISIONING_MIGRATION_CONFLICT" | "PROVISIONING_PROVIDER_FAILED" | "PROVISIONING_STORAGE_FAILED";
  public readonly providerCode?: string;
  public readonly providerStatus?: number | null;
  constructor(code: "PROVISIONING_TARGET_CONFLICT" | "PROVISIONING_MIGRATION_CONFLICT" | "PROVISIONING_PROVIDER_FAILED" | "PROVISIONING_STORAGE_FAILED", message: string, provider: { code?: string; status?: number | null } = {}) {
    super(message); this.name = "ProvisioningError"; this.code = code; this.providerCode = provider.code; this.providerStatus = provider.status;
  }
}

function defaultStorageDirectory() { return resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", ".publishing-targets"); }
function targetPath(root: string, siteId: string) {
  const directory = resolve(root); const target = resolve(directory, `${siteIdSchema.parse(siteId)}.json`);
  if (!target.startsWith(`${directory}${sep}`)) throw new ProvisioningError("PROVISIONING_STORAGE_FAILED", "Publishing target path escaped storage.");
  return target;
}
function assertNotMaster(baseDomain: string) {
  if (baseDomain === "ganomaster.pro" || baseDomain.endsWith(".ganomaster.pro")) {
    throw new ProvisioningError("PROVISIONING_MIGRATION_CONFLICT", "Master-domain targets are excluded from migration.");
  }
}
function migrateLegacyTarget(raw: unknown, rootEcosystemType?: z.infer<typeof publishingEcosystemTypeSchema>): PublishingTarget {
  const legacy = legacyPublishingTargetSchema.parse(raw);
  assertNotMaster(legacy.baseDomain);
  const isRoot = legacy.publicHost === legacy.baseDomain;
  const expectedSubdomain = getPartnerPublicHost(legacy.baseDomain, legacy.ecosystemType);
  if (!isRoot && legacy.publicHost !== expectedSubdomain) {
    throw new ProvisioningError("PROVISIONING_MIGRATION_CONFLICT", "Legacy target hostname does not match its ecosystem identity.");
  }
  const resolvedRoot = isRoot ? legacy.ecosystemType : rootEcosystemType;
  if (!resolvedRoot || (!isRoot && resolvedRoot === legacy.ecosystemType)) {
    throw new ProvisioningError("PROVISIONING_MIGRATION_CONFLICT", "Legacy target root ecosystem is ambiguous.");
  }
  return publishingTargetSchema.parse({
    ...legacy,
    version: 2,
    rootEcosystemType: resolvedRoot,
    publicationState: legacy.provisioningState === "READY" ? "READY" : "PENDING"
  });
}
async function persistTarget(root: string, target: PublishingTarget) {
  const destination = targetPath(root, target.siteId); const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(root, { recursive: true }); await writeFile(temporary, `${JSON.stringify(target, null, 2)}\n`); await rename(temporary, destination);
  return target;
}
export async function getPublishingTarget(siteId: string, root = defaultStorageDirectory(), rootEcosystemType?: z.infer<typeof publishingEcosystemTypeSchema>) {
  try {
    const raw = JSON.parse(await readFile(targetPath(root, siteId), "utf8"));
    const current = publishingTargetSchema.safeParse(raw);
    if (current.success) { assertNotMaster(current.data.baseDomain); return current.data; }
    const migrated = migrateLegacyTarget(raw, rootEcosystemType);
    return persistTarget(root, migrated);
  }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export async function listPublishingTargets(root = defaultStorageDirectory()) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const values = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => getPublishingTarget(entry.name.slice(0, -5), root)));
    return values.filter((value): value is PublishingTarget => Boolean(value));
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
function publicHost(input: ProvisionSubdomainInput) { return getPartnerPublicHost(input.baseDomain, input.ecosystemType); }
function providerCode(error: unknown) { return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "PROVISIONING_PROVIDER_FAILED"; }
function providerStatus(error: unknown) { return error && typeof error === "object" && "status" in error && typeof error.status === "number" && error.status >= 100 && error.status <= 599 ? error.status : null; }

export function createHostingerReadinessProbe(overrides: {
  resolve4?: (hostname: string) => Promise<string[]>;
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
} = {}): ReadinessProbe {
  const resolve4 = overrides.resolve4 ?? ((hostname: string) => dns.resolve4(hostname));
  const fetchImplementation = overrides.fetch ?? fetch;
  return {
    dnsResolves: async (host, ip, routingMode) => {
      try {
        const addresses = await resolve4(host);
        return routingMode === "HOSTINGER_ALIAS" ? addresses.length > 0 : addresses.includes(ip);
      } catch { return false; }
    },
    httpsReady: async (host, routingMode) => {
      try {
        const response = await fetchImplementation(`https://${host}/`, { redirect: "manual" });
        if (routingMode === "HOSTINGER_ALIAS") {
          return response.status >= 200 && response.status < 400 && response.headers.get("server")?.toLowerCase().includes("hcdn") === true;
        }
        return true;
      } catch { return false; }
    }
  };
}

export function createSubdomainProvisioningService(deps: Dependencies) {
  const root = resolve(deps.storageDirectory ?? defaultStorageDirectory()); const now = deps.now ?? (() => new Date());
  const probe = deps.readinessProbe ?? createHostingerReadinessProbe();
  async function save(target: PublishingTarget) { return persistTarget(root, publishingTargetSchema.parse(target)); }
  const get = (siteId: string) => getPublishingTarget(siteId, root); const list = () => listPublishingTargets(root);
  async function update(target: PublishingTarget, changes: Partial<PublishingTarget>) { return save({ ...target, ...changes, updatedAt: now().toISOString() }); }
  async function createOrLoad(input: ProvisionSubdomainInput) {
    const host = publicHost(input); const existing = await getPublishingTarget(input.siteId, root, input.rootEcosystemType);
    if (existing) {
      if (existing.ownerKey !== input.ownerKey || existing.ecosystemType !== input.ecosystemType || existing.rootEcosystemType !== input.rootEcosystemType || existing.baseDomain !== input.baseDomain || existing.publicHost !== host) throw new ProvisioningError("PROVISIONING_TARGET_CONFLICT", "Publishing target has a different immutable identity.");
      return existing;
    }
    const conflict = (await list()).find((item) => item.publicHost === host || (item.ownerKey === input.ownerKey && item.ecosystemType === input.ecosystemType));
    if (conflict) throw new ProvisioningError("PROVISIONING_TARGET_CONFLICT", "Publishing hostname or owner ecosystem already exists.");
    const timestamp = now().toISOString();
    return save({ version: 2, ownerKey: input.ownerKey, siteId: input.siteId, ecosystemType: input.ecosystemType, rootEcosystemType: input.rootEcosystemType, baseDomain: input.baseDomain, publicHost: host, remoteRoot: null, provisioningState: "PENDING", hostingerState: "PENDING", dnsState: "PENDING", sslState: "PENDING", publicationState: "PENDING", createdAt: timestamp, updatedAt: timestamp });
  }
  async function provision(raw: ProvisionSubdomainInput) {
    const input = provisionSubdomainInputSchema.parse(raw); let target = await createOrLoad(input);
    try {
      const hosting = (await deps.hostingerClient.ensure(input.baseDomain, PARTNER_HOST_LABELS[input.ecosystemType])).subdomain;
      if (target.remoteRoot && target.remoteRoot !== hosting.root_directory) {
        throw Object.assign(new Error("Hostinger returned a different document root for the persisted target."), { code: "HOSTINGER_SUBDOMAIN_CONFLICT" });
      }
      target = await update(target, { remoteRoot: hosting.root_directory, hostingerState: "READY", provisioningState: "HOSTING_CREATED", lastErrorCode: undefined });
      const record = await deps.dnsClient.ensureARecord(input.baseDomain, target.publicHost, input.ipv4);
      target = await update(target, { dnsRecordId: record.record.id, dnsState: "CREATED", provisioningState: "DNS_PENDING" });
      const checked = now().toISOString();
      if (!(await probe.dnsResolves(target.publicHost, input.ipv4, record.routingMode))) return update(target, { provisioningState: "DNS_PENDING", lastCheckedAt: checked });
      target = await update(target, { dnsState: "RESOLVED", provisioningState: "SSL_PENDING", lastCheckedAt: checked });
      if (!(await probe.httpsReady(target.publicHost, record.routingMode))) return target;
      return update(target, { sslState: "READY", provisioningState: "READY", publicationState: "PENDING", lastCheckedAt: now().toISOString(), lastErrorCode: undefined });
    } catch (error) {
      if (error instanceof ProvisioningError) throw error;
      const code = providerCode(error); const status = providerStatus(error); await update(target, { provisioningState: "FAILED", lastErrorCode: code, lastCheckedAt: now().toISOString() });
      throw new ProvisioningError("PROVISIONING_PROVIDER_FAILED", `Hostinger-only provisioning failed safely with code ${code}.`, { code, status });
    }
  }
  return { get, list, provision };
}
