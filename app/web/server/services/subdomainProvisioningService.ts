import { promises as dns } from "node:dns";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve, sep } from "node:path";

import { z } from "zod";

import type { CloudflareEnsureDnsResult } from "../integrations/cloudflareDnsClient.ts";
import type { HostingerEnsureSubdomainResult } from "../integrations/hostingerSubdomainClient.ts";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const ownerKeySchema = z.string().uuid();
const ecosystemTypeSchema = z.enum(["PRODUCT", "BUSINESS"]);
const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
const ipv4Schema = z.string().trim().refine((value) => isIP(value) === 4, "ipv4 must be valid");

const provisioningStateSchema = z.enum([
  "PENDING",
  "HOSTING_CREATED",
  "DNS_PENDING",
  "SSL_PENDING",
  "READY",
  "FAILED"
]);

const publishingTargetSchema = z.object({
  version: z.literal(1),
  ownerKey: ownerKeySchema,
  siteId: siteIdSchema,
  ecosystemType: ecosystemTypeSchema,
  baseDomain: hostnameSchema,
  publicHost: hostnameSchema,
  remoteRoot: z.string().min(1).nullable(),
  provisioningState: provisioningStateSchema,
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
export type ProvisioningState = z.infer<typeof provisioningStateSchema>;

export const provisionSubdomainInputSchema = z.object({
  ownerKey: ownerKeySchema,
  siteId: siteIdSchema,
  ecosystemType: ecosystemTypeSchema,
  baseDomain: hostnameSchema,
  ipv4: ipv4Schema,
  confirmation: z.literal("PROVISION_SUBDOMAIN")
});

export type ProvisionSubdomainInput = z.infer<typeof provisionSubdomainInputSchema>;

type HostingerClient = {
  ensure(parentDomain: string, label: string): Promise<HostingerEnsureSubdomainResult>;
};

type DnsClient = {
  ensureARecord(hostname: string, ipv4: string): Promise<CloudflareEnsureDnsResult>;
};

type ReadinessProbe = {
  dnsResolves(hostname: string, ipv4: string): Promise<boolean>;
  httpsReady(hostname: string): Promise<boolean>;
};

type ProvisioningDependencies = {
  hostingerClient: HostingerClient;
  dnsClient: DnsClient;
  readinessProbe?: ReadinessProbe;
  storageDirectory?: string;
  now?: () => Date;
};

export class ProvisioningError extends Error {
  public readonly code:
    | "PROVISIONING_TARGET_CONFLICT"
    | "PROVISIONING_PROVIDER_FAILED"
    | "PROVISIONING_STORAGE_FAILED";

  constructor(
    code:
      | "PROVISIONING_TARGET_CONFLICT"
      | "PROVISIONING_PROVIDER_FAILED"
      | "PROVISIONING_STORAGE_FAILED",
    message: string
  ) {
    super(message);
    this.name = "ProvisioningError";
    this.code = code;
  }
}

const ecosystemLabels: Record<z.infer<typeof ecosystemTypeSchema>, string> = {
  PRODUCT: "producto",
  BUSINESS: "negocio"
};

function defaultStorageDirectory() {
  const sourceRoot = process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources";
  return resolve(sourceRoot, ".publishing-targets");
}

export async function getPublishingTarget(
  siteId: string,
  storageDirectory = defaultStorageDirectory()
): Promise<PublishingTarget | null> {
  try {
    return publishingTargetSchema.parse(
      JSON.parse(await readFile(pathInside(resolve(storageDirectory), siteId), "utf8"))
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function listPublishingTargets(storageDirectory = defaultStorageDirectory()) {
  const directory = resolve(storageDirectory);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const targets = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => getPublishingTarget(entry.name.slice(0, -5), directory))
    );
    return targets.filter((target): target is PublishingTarget => Boolean(target));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function pathInside(rootDirectory: string, siteId: string) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = resolve(rootDirectory);
  const target = resolve(root, `${safeSiteId}.json`);
  if (!target.startsWith(`${root}${sep}`)) {
    throw new ProvisioningError("PROVISIONING_STORAGE_FAILED", "Publishing target path escaped storage.");
  }
  return target;
}

function providerErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "PROVISIONING_PROVIDER_FAILED";
}

function publicHostFor(baseDomain: string, ecosystemType: z.infer<typeof ecosystemTypeSchema>) {
  return `${ecosystemLabels[ecosystemType]}.${baseDomain}`;
}

function sameIdentity(target: PublishingTarget, input: ProvisionSubdomainInput) {
  return (
    target.ownerKey === input.ownerKey &&
    target.siteId === input.siteId &&
    target.ecosystemType === input.ecosystemType &&
    target.baseDomain === input.baseDomain &&
    target.publicHost === publicHostFor(input.baseDomain, input.ecosystemType)
  );
}

async function defaultDnsResolves(hostname: string, ipv4: string) {
  try {
    return (await dns.resolve4(hostname)).includes(ipv4);
  } catch {
    return false;
  }
}

async function defaultHttpsReady(hostname: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    await fetch(`https://${hostname}/`, { cache: "no-store", redirect: "manual", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function createSubdomainProvisioningService(dependencies: ProvisioningDependencies) {
  const storageDirectory = resolve(dependencies.storageDirectory ?? defaultStorageDirectory());
  const now = dependencies.now ?? (() => new Date());
  const readinessProbe = dependencies.readinessProbe ?? {
    dnsResolves: defaultDnsResolves,
    httpsReady: defaultHttpsReady
  };

  async function save(target: PublishingTarget) {
    const parsed = publishingTargetSchema.parse(target);
    const destination = pathInside(storageDirectory, parsed.siteId);
    const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
    return parsed;
  }

  async function get(siteId: string): Promise<PublishingTarget | null> {
    return getPublishingTarget(siteId, storageDirectory);
  }

  async function list(): Promise<PublishingTarget[]> {
    return listPublishingTargets(storageDirectory);
  }

  async function createOrLoad(input: ProvisionSubdomainInput) {
    const existing = await get(input.siteId);
    if (existing) {
      if (!sameIdentity(existing, input)) {
        throw new ProvisioningError(
          "PROVISIONING_TARGET_CONFLICT",
          `Publishing target ${input.siteId} already exists with different immutable identity.`
        );
      }
      return existing;
    }

    const ownerConflict = (await list()).find(
      (target) => target.ownerKey === input.ownerKey && target.ecosystemType === input.ecosystemType
    );
    if (ownerConflict) {
      throw new ProvisioningError(
        "PROVISIONING_TARGET_CONFLICT",
        `Owner already has a ${input.ecosystemType} publishing target.`
      );
    }

    const timestamp = now().toISOString();
    return save({
      version: 1,
      ownerKey: input.ownerKey,
      siteId: input.siteId,
      ecosystemType: input.ecosystemType,
      baseDomain: input.baseDomain,
      publicHost: publicHostFor(input.baseDomain, input.ecosystemType),
      remoteRoot: null,
      provisioningState: "PENDING",
      hostingerState: "PENDING",
      dnsState: "PENDING",
      sslState: "PENDING",
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  async function update(
    target: PublishingTarget,
    changes: Partial<Omit<PublishingTarget, "version" | "ownerKey" | "siteId" | "ecosystemType" | "baseDomain" | "publicHost" | "createdAt">>
  ) {
    return save({
      ...target,
      ...changes,
      updatedAt: now().toISOString()
    });
  }

  async function provision(rawInput: ProvisionSubdomainInput) {
    const input = provisionSubdomainInputSchema.parse(rawInput);
    let target = await createOrLoad(input);
    const label = ecosystemLabels[input.ecosystemType];

    try {
      const hosting = await dependencies.hostingerClient.ensure(input.baseDomain, label);
      target = await update(target, {
        remoteRoot: hosting.subdomain.root_directory,
        hostingerState: "READY",
        provisioningState: "HOSTING_CREATED",
        lastErrorCode: undefined
      });

      target = await update(target, { provisioningState: "DNS_PENDING" });
      const dnsRecord = await dependencies.dnsClient.ensureARecord(target.publicHost, input.ipv4);
      target = await update(target, {
        dnsRecordId: dnsRecord.record.id,
        dnsState: "CREATED",
        provisioningState: "DNS_PENDING",
        lastErrorCode: undefined
      });

      const checkedAt = now().toISOString();
      if (!(await readinessProbe.dnsResolves(target.publicHost, input.ipv4))) {
        return update(target, { provisioningState: "DNS_PENDING", lastCheckedAt: checkedAt });
      }

      target = await update(target, {
        dnsState: "RESOLVED",
        provisioningState: "SSL_PENDING",
        lastCheckedAt: checkedAt
      });

      if (!(await readinessProbe.httpsReady(target.publicHost))) {
        return target;
      }

      return update(target, {
        sslState: "READY",
        provisioningState: "READY",
        lastCheckedAt: now().toISOString(),
        lastErrorCode: undefined
      });
    } catch (error) {
      if (error instanceof ProvisioningError) throw error;
      const safeCode = providerErrorCode(error);
      await update(target, {
        provisioningState: "FAILED",
        lastErrorCode: safeCode,
        lastCheckedAt: now().toISOString()
      });
      throw new ProvisioningError(
        "PROVISIONING_PROVIDER_FAILED",
        `Subdomain provisioning failed safely with code ${safeCode}.`
      );
    }
  }

  return { get, list, provision };
}
