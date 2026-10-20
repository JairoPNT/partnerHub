import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import SftpClient from "ssh2-sftp-client";

import { productPagePublicationService } from "@/server/services/productPagePublicationService";
import { productPageVerificationService } from "@/server/services/productPageVerificationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { productPageHistoryService } from "@/server/services/productPageHistoryService";
import { ProductMutationBusyError, withProductMutation } from "@/server/services/productMutationCoordinator";

const owner = "f403f29e-95c8-4825-9320-967376443020";
const foreign = "19b88a1d-e24d-48b0-a940-e9d35492266f";
const siteId = "legacy-partner";
const expectedRoot = "/home/u123456789/domains/partner.pro/public_html/producto";
const source = { site: { id: siteId, domain: "producto.partner.pro", title: "Partner" } };
const lead = { id: owner, siteId, fullName: "Partner Name", brandName: "Partner", whatsapp: "573001234567", onboardingData: { domain: "partner.pro" } };
const readyTarget = { version: 2, ownerKey: owner, siteId, ecosystemType: "PRODUCT", rootEcosystemType: "PRODUCT", baseDomain: "partner.pro", publicHost: "producto.partner.pro", remoteRoot: expectedRoot, provisioningState: "READY", hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY", publicationState: "READY", createdAt: "2026-10-20T00:00:00.000Z", updatedAt: "2026-10-20T00:00:00.000Z" };

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((done) => { release = done; });
  return { promise, release };
}

test("direct legacy Product publish claims before reading source or contacting transport", async (t) => {
  const fx = await fixture(t); const entered = barrier(); const finish = barrier();
  const originalGet = productPageSourceService.get;
  let reads = 0;
  t.mock.method(productPageSourceService, "get", async (id: string) => { reads++; return originalGet(id); });
  const owner = withProductMutation(siteId, async () => { entered.release(); await finish.promise; });
  try {
    await entered.promise;
    await assert.rejects(productPagePublicationService.publish({ siteId }), ProductMutationBusyError);
    assert.equal(reads, 0); assert.deepEqual(fx.effects, []);
  } finally { finish.release(); await owner; }
});

for (const phase of ["upload", "verification", "history"] as const) {
  test(`direct Product publish retains ownership through ${phase} and releases after completion`, async (t) => {
    await fixture(t); const entered = barrier(); const finish = barrier();
    if (phase === "upload") t.mock.method(SftpClient.prototype, "put", async () => { entered.release(); await finish.promise; });
    if (phase === "verification") t.mock.method(productPageVerificationService, "verify", async () => {
      entered.release(); await finish.promise;
      return { domain: "producto.partner.pro", verifiedAt: "2026-10-20T00:00:00.000Z", status: "VERIFIED" as const, checks: [] };
    });
    if (phase === "history") {
      const append = productPageHistoryService.append;
      t.mock.method(productPageHistoryService, "append", async (event: Parameters<typeof append>[0]) => {
        entered.release(); await finish.promise; return append(event);
      });
    }
    const publication = productPagePublicationService.publish({ siteId });
    try {
      await Promise.race([entered.promise, publication.then(() => assert.fail("publication finished before pause"))]);
      await assert.rejects(productPageSourceService.save(siteId, source), ProductMutationBusyError);
      await assert.rejects(productPagePublicationService.publish({ siteId }), ProductMutationBusyError);
      finish.release();
      assert.equal((await publication).publicationState, "VERIFIED");
      await productPageSourceService.save(siteId, source);
    } finally { finish.release(); await publication; }
  });
}

async function fixture(t: test.TestContext, overrides: { siteId?: string; source?: unknown; target?: unknown; leads?: unknown[]; environment?: Record<string, string> } = {}) {
  const publicationSiteId = overrides.siteId ?? siteId;
  const root = await mkdtemp(join(tmpdir(), "product-publish-boundary-"));
  const sources = join(root, "sources");
  const activation = join(root, "activation");
  const output = join(root, "output");
  const environment = {
    PRODUCT_PAGE_SOURCE_DIR: sources, PRODUCT_PAGE_ACTIVATION_DIR: activation, PRODUCT_PAGE_OUTPUT_DIR: output,
    HOSTINGER_SFTP_HOST: "sftp.invalid", HOSTINGER_SFTP_PORT: "22", HOSTINGER_SFTP_USERNAME: "u123456789", HOSTINGER_SFTP_PASSWORD: "fixture-only",
    HOSTINGER_SFTP_REMOTE_ROOT: "/home/u123456789/domains/partner.pro/public_html", HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE: "", HOSTINGER_SFTP_REMOTE_ROOTS_JSON: "", HOSTINGER_MASTER_REMOTE_ROOT: "/home/u123456789/domains/ganomaster.pro/public_html",
    ...overrides.environment
  };
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  t.after(async () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(join(sources, ".publishing-targets"), { recursive: true });
  await mkdir(activation, { recursive: true });
  await writeFile(join(sources, `${publicationSiteId}.json`), JSON.stringify(overrides.source ?? { ...source, site: { ...source.site, id: publicationSiteId } }));
  await writeFile(join(activation, "leads.json"), JSON.stringify(overrides.leads ?? [lead]));
  const target = overrides.target === undefined ? { ...readyTarget, siteId: publicationSiteId } : overrides.target;
  if (target !== null) await writeFile(join(sources, ".publishing-targets", `${publicationSiteId}.json`), JSON.stringify(target));
  // Real output files: success must upload their bytes only to the validated root.
  await mkdir(join(output, publicationSiteId), { recursive: true });
  await writeFile(join(output, publicationSiteId, "index.html"), "<h1>Partner</h1>");
  const effects: string[] = [];
  t.mock.method(SftpClient.prototype, "connect", async () => { effects.push("connect"); });
  t.mock.method(SftpClient.prototype, "mkdir", async (path: string) => { effects.push(`mkdir:${path}`); });
  t.mock.method(SftpClient.prototype, "put", async (local: string, remote: string) => { effects.push(`put:${remote}:${await readFile(local, "utf8")}`); });
  t.mock.method(SftpClient.prototype, "exists", async () => false);
  t.mock.method(SftpClient.prototype, "rename", async (_from: string, to: string) => { effects.push(`rename:${to}`); });
  t.mock.method(SftpClient.prototype, "delete", async () => {});
  t.mock.method(SftpClient.prototype, "end", async () => {});
  t.mock.method(productPageVerificationService, "verify", async () => ({ domain: "producto.partner.pro", verifiedAt: "2026-10-20T00:00:00.000Z", status: "VERIFIED", checks: [] }));
  return { effects, sources, output };
}

// Each mutation would otherwise let the real publisher reach transport/overwrite.
const invalidCases: [string, Parameters<typeof fixture>[1]][] = [
  ["Brand source contradicts Product target and foreign apex root", {
    source: { ...source, ecosystemType: "PERSONAL_BRAND" },
    target: { ...readyTarget, ownerKey: foreign, remoteRoot: "/home/u123456789/domains/foreign.pro/public_html" }
  }],
  ["Brand source contradicts otherwise valid Product target", { source: { ...source, ecosystemType: "PERSONAL_BRAND" } }],
  ["missing target", { target: null }],
  ["non-READY target", { target: { ...readyTarget, provisioningState: "SSL_PENDING" } }],
  ["foreign site", { target: { ...readyTarget, siteId: "foreign-product" } }],
  ["foreign owner", { target: { ...readyTarget, ownerKey: foreign } }],
  ["missing owner", { target: { ...readyTarget, ownerKey: undefined } }],
  ["foreign base", { target: { ...readyTarget, baseDomain: "foreign.pro" } }],
  ["apex public host", { target: { ...readyTarget, publicHost: "partner.pro" } }],
  ["foreign ecosystem", { target: { ...readyTarget, ecosystemType: "BUSINESS" } }],
  ["apex root", { target: { ...readyTarget, remoteRoot: "/home/u123456789/domains/partner.pro/public_html" } }],
  ["old account root", { target: { ...readyTarget, remoteRoot: "/home/u658137804/domains/partner.pro/public_html/producto" } }],
  ["foreign root domain", { target: { ...readyTarget, remoteRoot: "/home/u123456789/domains/foreign.pro/public_html/producto" } }],
  ["normalized traversal root", { target: { ...readyTarget, remoteRoot: `${expectedRoot}/../producto` } }],
  ["legacy target (must not auto-migrate)", { target: { ...readyTarget, version: 1, publicHost: "partner.pro" } }],
  ["source still on apex while 022 pending", { source: { ...source, site: { ...source.site, domain: "partner.pro" } } }],
  ["source claims different site", { source: { ...source, site: { ...source.site, id: "foreign-product" } } }],
  ["source foreign owner", { source: { ...source, ownerKey: foreign } }],
  ["source foreign base", { source: { ...source, baseDomain: "foreign.pro" } }],
  ["unknown authoritative owner", { leads: [] }],
  ["duplicate owner evidence", { leads: [lead, { ...lead, id: foreign }] }],
  ["prefixed base", { leads: [{ ...lead, onboardingData: { domain: "producto.partner.pro" } }] }],
  ["foreign mapped root cannot bypass", { environment: { HOSTINGER_SFTP_REMOTE_ROOTS_JSON: JSON.stringify({ [siteId]: "/home/u123456789/domains/partner.pro/public_html" }) } }],
  ["old configured template", { environment: { HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE: "/home/u658137804/domains/{domain}/public_html" } }],
  ["ambiguous configured account", { environment: { HOSTINGER_SFTP_REMOTE_ROOT: "/home/u658137804/domains/partner.pro/public_html" } }]
];

test("Business source cannot route a contradictory Product target through generic resolution", async (t) => {
  const fx = await fixture(t, {
    siteId: "partner-business",
    source: { ecosystemType: "BUSINESS", site: { id: "partner-business", domain: "negocio.partner.pro" } },
    target: { ...readyTarget, siteId: "partner-business", ownerKey: foreign, remoteRoot: "/home/u123456789/domains/foreign.pro/public_html" }
  });
  await assert.rejects(productPagePublicationService.publish({ siteId: "partner-business" }));
  assert.deepEqual(fx.effects, []);
});

for (const [name, overrides] of invalidCases) {
  test(`Product publisher blocks ${name} before transport`, async (t) => {
    const fx = await fixture(t, overrides);
    await assert.rejects(productPagePublicationService.publish({ siteId }));
    assert.deepEqual(fx.effects, []);
    if (overrides?.target && typeof overrides.target === "object" && "version" in overrides.target) {
      assert.equal(JSON.parse(await readFile(join(fx.sources, ".publishing-targets", `${siteId}.json`), "utf8")).version, overrides.target.version);
    }
  });
}

test("canonical legacy Product with authoritative lead and exact root publishes", async (t) => {
  const fx = await fixture(t);
  const result = await productPagePublicationService.publish({ siteId });
  assert.equal(result.remoteRoot, expectedRoot);
  assert.equal(result.publicationState, "VERIFIED");
  assert.ok(fx.effects.includes(`rename:${expectedRoot}/index.html`));
  assert.ok(fx.effects.some((effect) => effect.startsWith(`put:${expectedRoot}/.`) && effect.endsWith(":<h1>Partner</h1>")));
});

test("matching domain and display name cannot invent an owner", async (t) => {
  const fx = await fixture(t, { leads: [{ ...lead, siteId: "legacy", onboardingData: { domain: "partner.pro" } }] });
  // This ID is deliberately not the canonical derived ID; a matching domain/name is insufficient.
  await assert.rejects(productPagePublicationService.publish({ siteId }));
  assert.deepEqual(fx.effects, []);
});

for (const template of ["/home/u123456789/domains/{domain}/public_html", "/home/u123456789/domains/{domain}/public_html/producto"]) {
  test(`Product derives exact isolated root from trusted template ${template}`, async (t) => {
    const fx = await fixture(t, { environment: { HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE: template } });
    assert.equal((await productPagePublicationService.publish({ siteId })).remoteRoot, expectedRoot);
    assert.ok(fx.effects.includes(`rename:${expectedRoot}/index.html`));
  });
}

test("derived Product ID binds a unique primary lead with matching canonical domain", async (t) => {
  const fx = await fixture(t, { siteId: "legacy-partner-product" });
  assert.equal((await productPagePublicationService.publish({ siteId: "legacy-partner-product" })).remoteRoot, expectedRoot);
  assert.ok(fx.effects.includes(`rename:${expectedRoot}/index.html`));
});

for (const publicationSiteId of [siteId, "legacy-partner-product"]) {
  for (const conflictingDomain of ["partner.pro", " WWW.Partner.Pro "]) {
    test(`${publicationSiteId} rejects a distinct owner claiming normalized base ${conflictingDomain}`, async (t) => {
      const fx = await fixture(t, {
        siteId: publicationSiteId,
        leads: [lead, { ...lead, id: foreign, siteId: "other-partner", onboardingData: { domain: conflictingDomain } }]
      });
      await assert.rejects(productPagePublicationService.publish({ siteId: publicationSiteId }));
      assert.deepEqual(fx.effects, []);
    });
  }
}

test("a different owner's unrelated base does not block the legitimate Product destination", async (t) => {
  const fx = await fixture(t, { leads: [lead, { ...lead, id: foreign, siteId: "other-partner", onboardingData: { domain: "other.pro" } }] });
  assert.equal((await productPagePublicationService.publish({ siteId })).remoteRoot, expectedRoot);
  assert.ok(fx.effects.includes(`rename:${expectedRoot}/index.html`));
});

for (const [publicationSiteId, ecosystemType, domain, root] of [
  ["ganomaster", "PRODUCT", "product.ganomaster.pro", "/home/u123456789/domains/ganomaster.pro/public_html/product"],
  ["partner-business", "BUSINESS", "negocio.partner.pro", "/unchanged/business"],
  ["partner-brand", "PERSONAL_BRAND", "partner.pro", "/unchanged/brand"]
] as const) {
  test(`${ecosystemType} ${publicationSiteId} preserves non-Product/master publication behavior`, async (t) => {
    const fx = await fixture(t, {
      siteId: publicationSiteId,
      source: { ecosystemType, site: { id: publicationSiteId, domain } },
      target: publicationSiteId === "ganomaster" ? null : { ...readyTarget, siteId: publicationSiteId, ecosystemType, publicHost: domain, remoteRoot: root },
      leads: []
    });
    assert.equal((await productPagePublicationService.publish({ siteId: publicationSiteId })).remoteRoot, root);
    assert.ok(fx.effects.includes(`rename:${root}/index.html`));
  });
}
