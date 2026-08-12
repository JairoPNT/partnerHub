import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSubdomainProvisioningService, ProvisioningError, provisionSubdomainInputSchema } from "./subdomainProvisioningService.ts";

const ownerKey = "cb841c76-4f50-4ee7-90bb-021094e5c1f7";
const website = { username: "u658137804", domain: "jairopinto.pro", root_directory: "/hostinger/root-from-api" };
const subdomain = (label: "producto" | "negocio") => ({ state: "EXISTING" as const, subdomain: { username: "u658137804", domain: `${label}.jairopinto.pro`, parent_domain: "jairopinto.pro", root_directory: `/hostinger/${label}-from-api`, subdomain: label } });
const dnsResult = (host: string) => ({ state: "EXISTING" as const, record: { id: `dns-${host}`, type: "A" as const, name: host, content: "82.29.157.103" } });
async function isolated(run: (directory: string) => Promise<void>) { const directory = await mkdtemp(join(tmpdir(), "hostinger-only-")); try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); } }

function service(directory: string, options: { dnsReady?: boolean; sslReady?: boolean; fail?: boolean } = {}) {
  const calls: string[] = [];
  return { calls, instance: createSubdomainProvisioningService({
    storageDirectory: directory,
    hostingerClient: {
      getWebsite: async () => { calls.push("root"); if (options.fail) throw Object.assign(new Error("secret"), { code: "HOSTINGER_RATE_LIMITED" }); return website; },
      ensure: async (_domain, label) => { calls.push(label); return subdomain(label as "producto" | "negocio"); }
    },
    dnsClient: { ensureARecord: async (_zone, host) => { calls.push(`dns:${host}`); return dnsResult(host); } },
    readinessProbe: { dnsResolves: async () => options.dnsReady ?? true, httpsReady: async () => options.sslReady ?? true },
    now: () => new Date("2026-08-12T18:00:00.000Z")
  }) };
}

test("persists PERSONAL_BRAND on root and uses Hostinger returned document root", async () => isolated(async (directory) => {
  const { instance, calls } = service(directory);
  const target = await instance.provision({ ownerKey, siteId: "jairo-brand", ecosystemType: "PERSONAL_BRAND", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(target.publicHost, "jairopinto.pro"); assert.equal(target.remoteRoot, website.root_directory); assert.equal(target.provisioningState, "READY");
  assert.deepEqual(calls, ["root", "dns:jairopinto.pro"]);
}));

test("maps Plan 360 product and business to isolated Hostinger roots", async () => isolated(async (directory) => {
  const { instance } = service(directory);
  const product = await instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  const business = await instance.provision({ ownerKey, siteId: "jairo-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(product.publicHost, "producto.jairopinto.pro"); assert.equal(product.remoteRoot, "/hostinger/producto-from-api");
  assert.equal(business.publicHost, "negocio.jairopinto.pro"); assert.equal(business.remoteRoot, "/hostinger/negocio-from-api");
}));

test("uses persisted fallback ecosystem at root for individual offers", async () => isolated(async (directory) => {
  const { instance, calls } = service(directory);
  const target = await instance.provision({ ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT", baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" });
  assert.equal(target.publicHost, "jairopinto.pro"); assert.equal(target.rootEcosystemType, "PRODUCT"); assert.deepEqual(calls, ["root", "dns:jairopinto.pro"]);
}));

test("retries DNS_PENDING and FAILED safely with idempotent provider calls", async () => isolated(async (directory) => {
  const pendingService = service(directory, { dnsReady: false });
  const input = { ownerKey, siteId: "jairo-product", ecosystemType: "PRODUCT" as const, rootEcosystemType: "PRODUCT" as const, baseDomain: "jairopinto.pro", ipv4: "82.29.157.103", confirmation: "PROVISION_SUBDOMAIN" as const };
  assert.equal((await pendingService.instance.provision(input)).provisioningState, "DNS_PENDING");
  const recovered = service(directory); assert.equal((await recovered.instance.provision(input)).provisioningState, "READY");
  await isolated(async (failedDirectory) => { const failed = service(failedDirectory, { fail: true }); await assert.rejects(() => failed.instance.provision(input), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_PROVIDER_FAILED"); assert.equal((await failed.instance.get(input.siteId))?.provisioningState, "FAILED"); });
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
