import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createHostingerReadinessProbe, createSubdomainProvisioningService, ProvisioningError, provisionSubdomainInputSchema } from "./subdomainProvisioningService.ts";

const ownerKey = "cb841c76-4f50-4ee7-90bb-021094e5c1f7";
const website = { username: "u658137804", domain: "jairopinto.pro", root_directory: "/hostinger/root-from-api" };
const subdomain = (label: "producto" | "negocio" | "brand") => ({ state: "EXISTING" as const, subdomain: { username: "u658137804", domain: `${label}.jairopinto.pro`, parent_domain: "jairopinto.pro", root_directory: `/hostinger/${label}-from-api`, subdomain: label } });
const dnsResult = (host: string) => ({ state: "EXISTING" as const, routingMode: "DIRECT_A" as const, record: { id: `dns-${host}`, type: "A" as const, name: host, content: "82.29.157.103" } });
async function isolated(run: (directory: string) => Promise<void>) { const directory = await mkdtemp(join(tmpdir(), "hostinger-only-")); try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); } }

function service(directory: string, options: { dnsReady?: boolean; sslReady?: boolean; fail?: boolean } = {}) {
  const calls: string[] = [];
  return { calls, instance: createSubdomainProvisioningService({
    storageDirectory: directory,
    hostingerClient: {
      getWebsite: async () => { calls.push("root"); if (options.fail) throw Object.assign(new Error("secret"), { code: "HOSTINGER_RATE_LIMITED" }); return website; },
      ensure: async (_domain, label) => { calls.push(label); if (options.fail) throw Object.assign(new Error("secret"), { code: "HOSTINGER_RATE_LIMITED" }); return subdomain(label as "producto" | "negocio" | "brand"); }
    },
    dnsClient: { ensureARecord: async (_zone, host) => { calls.push(`dns:${host}`); return dnsResult(host); } },
    readinessProbe: { dnsResolves: async () => options.dnsReady ?? true, httpsReady: async () => options.sslReady ?? true },
    now: () => new Date("2026-08-12T18:00:00.000Z")
  }) };
}

test("persists PERSONAL_BRAND on its canonical brand subdomain", async () => isolated(async (directory) => {
  const { instance, calls } = service(directory);
  const target = await instance.provision({ ownerKey, siteId: "jairo-brand", ecosystemType: "PERSONAL_BRAND", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(target.publicHost, "brand.jairopinto.pro"); assert.equal(target.remoteRoot, "/hostinger/brand-from-api"); assert.equal(target.provisioningState, "READY");
  assert.equal(target.publicationState, "PENDING");
  assert.deepEqual(calls, ["brand", "dns:brand.jairopinto.pro"]);
}));

test("maps Plan 360 product and business to isolated Hostinger roots", async () => isolated(async (directory) => {
  const { instance } = service(directory);
  const product = await instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  const business = await instance.provision({ ownerKey, siteId: "jairo-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(product.publicHost, "producto.jairopinto.pro"); assert.equal(product.remoteRoot, "/hostinger/producto-from-api");
  assert.equal(business.publicHost, "negocio.jairopinto.pro"); assert.equal(business.remoteRoot, "/hostinger/negocio-from-api");
}));

test("accepts an exact Hostinger ALIAS route and passes its mode to readiness without DNS mutation", async () => isolated(async (directory) => {
  const readiness: string[] = [];
  const instance = createSubdomainProvisioningService({
    storageDirectory: directory,
    hostingerClient: { ensure: async () => subdomain("negocio") },
    dnsClient: {
      ensureARecord: async (_zone, host) => ({
        state: "EXISTING_ALIAS",
        routingMode: "HOSTINGER_ALIAS",
        record: { id: `hostinger-alias-${host}`, type: "ALIAS", name: host }
      })
    },
    readinessProbe: {
      dnsResolves: async (_host, _ipv4, mode) => { readiness.push(`dns:${mode}`); return true; },
      httpsReady: async (_host, mode) => { readiness.push(`https:${mode}`); return true; }
    }
  });
  const target = await instance.provision({ ownerKey, siteId: "jairo-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(target.provisioningState, "READY");
  assert.equal(target.publicationState, "PENDING");
  assert.equal(target.dnsRecordId, "hostinger-alias-negocio.jairopinto.pro");
  assert.deepEqual(readiness, ["dns:HOSTINGER_ALIAS", "https:HOSTINGER_ALIAS"]);
}));

test("requires Hostinger CDN HTTPS while allowing provider-managed ALIAS addresses", async () => {
  const responses = [
    new Response("", { status: 200, headers: { server: "hcdn" } }),
    new Response("", { status: 200, headers: { server: "other" } }),
    new Response("", { status: 500, headers: { server: "hcdn" } })
  ];
  const probe = createHostingerReadinessProbe({
    resolve4: async () => ["2.57.91.138", "84.32.84.169"],
    fetch: async () => responses.shift()!
  });
  assert.equal(await probe.dnsResolves("negocio.jairopinto.pro", "82.29.157.103", "HOSTINGER_ALIAS"), true);
  assert.equal(await probe.dnsResolves("negocio.jairopinto.pro", "82.29.157.103", "DIRECT_A"), false);
  assert.equal(await probe.httpsReady("negocio.jairopinto.pro", "HOSTINGER_ALIAS"), true);
  assert.equal(await probe.httpsReady("negocio.jairopinto.pro", "HOSTINGER_ALIAS"), false);
  assert.equal(await probe.httpsReady("negocio.jairopinto.pro", "HOSTINGER_ALIAS"), false);
});

test("keeps rootEcosystemType as redirect metadata without turning the target into apex", async () => isolated(async (directory) => {
  const { instance, calls } = service(directory);
  const target = await instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(target.publicHost, "producto.jairopinto.pro"); assert.equal(target.rootEcosystemType, "PRODUCT"); assert.deepEqual(calls, ["producto", "dns:producto.jairopinto.pro"]);
}));

test("retries DNS_PENDING and FAILED safely with idempotent provider calls", async () => isolated(async (directory) => {
  const pendingService = service(directory, { dnsReady: false });
  const input = { ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT" as const, rootEcosystemType: "PRODUCT" as const, baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" as const };
  assert.equal((await pendingService.instance.provision(input)).provisioningState, "DNS_PENDING");
  const recovered = service(directory); assert.equal((await recovered.instance.provision(input)).provisioningState, "READY");
  await isolated(async (failedDirectory) => { const failed = service(failedDirectory, { fail: true }); await assert.rejects(() => failed.instance.provision(input), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_PROVIDER_FAILED"); assert.equal((await failed.instance.get(input.siteId))?.provisioningState, "FAILED"); });
}));

test("exposes only safe provider code and HTTP status for audited recovery", async () => isolated(async (directory) => {
  const instance = createSubdomainProvisioningService({
    storageDirectory: directory,
    hostingerClient: { ensure: async () => subdomain("negocio") },
    dnsClient: { ensureARecord: async () => { throw Object.assign(new Error("provider response secret"), { code: "HOSTINGER_DNS_PROVIDER_FAILED", status: 500 }); } },
    readinessProbe: { dnsResolves: async () => false, httpsReady: async () => false }
  });
  await assert.rejects(
    () => instance.provision({ ownerKey, siteId: "jairo-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" }),
    (error: unknown) => error instanceof ProvisioningError && error.providerCode === "HOSTINGER_DNS_PROVIDER_FAILED" && error.providerStatus === 500 && !error.message.includes("secret")
  );
}));

test("retries SSL_PENDING safely without changing the persisted identity or root", async () => isolated(async (directory) => {
  const input = { ownerKey, siteId: "jairo-brand", ecosystemType: "PERSONAL_BRAND" as const, rootEcosystemType: "PERSONAL_BRAND" as const, baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" as const };
  const pending = service(directory, { sslReady: false });
  const first = await pending.instance.provision(input);
  assert.equal(first.provisioningState, "SSL_PENDING");
  const recovered = service(directory);
  const ready = await recovered.instance.provision(input);
  assert.equal(ready.provisioningState, "READY");
  assert.equal(ready.remoteRoot, first.remoteRoot);
  assert.equal(ready.rootEcosystemType, first.rootEcosystemType);
}));

test("protects ganomaster and rejects immutable root fallback conflicts before provider calls", async () => isolated(async (directory) => {
  assert.equal(provisionSubdomainInputSchema.safeParse({ ownerKey, siteId: "master", ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT", baseDomain: "ganomaster.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" }).success, false);
  const { instance, calls } = service(directory); const input = { ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT" as const, rootEcosystemType: "PRODUCT" as const, baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" as const };
  await instance.provision(input); const count = calls.length;
  await assert.rejects(() => instance.provision({ ...input, rootEcosystemType: "PERSONAL_BRAND" }), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_TARGET_CONFLICT"); assert.equal(calls.length, count);
}));

test("migrates an unambiguous v1 root target to v2 without changing its persisted root", async () => isolated(async (directory) => {
  const legacy = {
    version: 1, ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", baseDomain: "jairopinto.pro",
    publicHost: "jairopinto.pro", remoteRoot: "/legacy/hostinger-root", provisioningState: "READY",
    hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY",
    createdAt: "2026-08-07T12:00:00.000Z", updatedAt: "2026-08-07T12:00:00.000Z"
  };
  await writeFile(join(directory, "jairo-product.json"), JSON.stringify(legacy));
  const { instance } = service(directory);
  const migrated = await instance.get("jairo-product");
  assert.equal(migrated?.version, 2); assert.equal(migrated?.rootEcosystemType, "PRODUCT"); assert.equal(migrated?.remoteRoot, legacy.remoteRoot);
  assert.equal(JSON.parse(await readFile(join(directory, "jairo-product.json"), "utf8")).version, 2);
}));

test("preserves an existing v2 apex target and blocks silent canonical reprovisioning", async () => isolated(async (directory) => {
  const existing = {
    version: 2, ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT",
    baseDomain: "jairopinto.pro", publicHost: "jairopinto.pro", remoteRoot: "/legacy/hostinger-root",
    provisioningState: "READY", hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY",
    publicationState: "READY", createdAt: "2026-08-07T12:00:00.000Z", updatedAt: "2026-08-07T12:00:00.000Z"
  };
  await writeFile(join(directory, "jairo-product.json"), JSON.stringify(existing));
  const { instance, calls } = service(directory);
  assert.equal((await instance.get("jairo-product"))?.publicHost, "jairopinto.pro");
  await assert.rejects(() => instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" }), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_TARGET_CONFLICT");
  assert.deepEqual(calls, []);
  assert.equal(JSON.parse(await readFile(join(directory, "jairo-product.json"), "utf8")).publicHost, "jairopinto.pro");
}));

test("migrates a v1 subdomain only with explicit non-ambiguous root identity", async () => isolated(async (directory) => {
  const legacy = {
    version: 1, ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", baseDomain: "jairopinto.pro",
    publicHost: "producto.jairopinto.pro", remoteRoot: "/hostinger/producto-from-api", provisioningState: "DNS_PENDING",
    hostingerState: "READY", dnsState: "CREATED", sslState: "PENDING",
    createdAt: "2026-08-07T12:00:00.000Z", updatedAt: "2026-08-07T12:00:00.000Z"
  };
  await writeFile(join(directory, "jairo-product.json"), JSON.stringify(legacy));
  const { instance } = service(directory);
  await assert.rejects(() => instance.get("jairo-product"), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_MIGRATION_CONFLICT");
  const migrated = await instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(migrated.version, 2); assert.equal(migrated.rootEcosystemType, "PERSONAL_BRAND");
}));

test("stops on a changed Hostinger document root and persists only a safe conflict code", async () => isolated(async (directory) => {
  const first = service(directory); const input = { ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT" as const, rootEcosystemType: "PERSONAL_BRAND" as const, baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" as const };
  await first.instance.provision(input);
  const conflicting = createSubdomainProvisioningService({
    storageDirectory: directory,
    hostingerClient: { getWebsite: async () => website, ensure: async () => ({ ...subdomain("producto"), subdomain: { ...subdomain("producto").subdomain, root_directory: "/unexpected/root" } }) },
    dnsClient: { ensureARecord: async (_zone, host) => dnsResult(host) },
    readinessProbe: { dnsResolves: async () => true, httpsReady: async () => true }
  });
  await assert.rejects(() => conflicting.provision(input), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_PROVIDER_FAILED" && !error.message.includes("/unexpected/root"));
  const persisted = JSON.parse(await readFile(join(directory, "jairo-product.json"), "utf8"));
  assert.equal(persisted.remoteRoot, "/hostinger/producto-from-api"); assert.equal(persisted.lastErrorCode, "HOSTINGER_SUBDOMAIN_CONFLICT"); assert.equal(persisted.provisioningState, "FAILED");
}));

test("never migrates a legacy ganomaster target", async () => isolated(async (directory) => {
  const legacy = { version: 1, ownerKey, siteId: "master-product", ecosystemType: "PRODUCT", baseDomain: "ganomaster.pro", publicHost: "producto.ganomaster.pro", remoteRoot: "/master", provisioningState: "READY", hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY", createdAt: "2026-08-07T12:00:00.000Z", updatedAt: "2026-08-07T12:00:00.000Z" };
  await writeFile(join(directory, "master-product.json"), JSON.stringify(legacy));
  const { instance, calls } = service(directory);
  await assert.rejects(() => instance.get("master-product"), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_MIGRATION_CONFLICT"); assert.equal(calls.length, 0);
  assert.equal(JSON.parse(await readFile(join(directory, "master-product.json"), "utf8")).version, 1);
}));
