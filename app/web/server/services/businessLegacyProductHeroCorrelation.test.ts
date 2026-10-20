import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import { businessProductHeroCorrelationService } from "./businessProductHeroCorrelationService.ts";

const owner = "22222222-2222-4222-8222-222222222222";
const foreign = "33333333-3333-4333-8333-333333333333";
const desktop = "https://cdn.example/Claudia/Hero%20Desktop.webp?version=ExactCase";

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "partnerhub-legacy-poster-"));
  const sources = join(directory, "sources");
  const activation = join(directory, "activation");
  const targets = join(sources, ".publishing-targets");
  await Promise.all([mkdir(targets, { recursive: true }), mkdir(activation)]);
  const previous = [process.env.PRODUCT_PAGE_SOURCE_DIR, process.env.PRODUCT_PAGE_ACTIVATION_DIR];
  process.env.PRODUCT_PAGE_SOURCE_DIR = sources;
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = activation;
  t.after(async () => {
    for (const [index, name] of ["PRODUCT_PAGE_SOURCE_DIR", "PRODUCT_PAGE_ACTIVATION_DIR"].entries()) {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    }
    await rm(directory, { recursive: true, force: true });
  });
  const write = async (path: string, value: unknown) => writeFile(path, JSON.stringify(value));
  const lead = { id: owner, siteId: "claudia-calero", fullName: "Claudia Calero", brandName: "Claudia Calero",
    whatsapp: "573001234567", email: "claudia@example.test", paymentMethod: "direct", termsAccepted: true,
    status: "PAID", recordState: "ACTIVE", publicationState: "VERIFIED", ecosystemType: "PRODUCT",
    createdAt: "2026-10-20T00:00:00.000Z", updatedAt: "2026-10-20T00:00:00.000Z",
    onboardingTokenHash: "0".repeat(64), onboardingData: { domain: "claudiacalero.pro" } };
  const source = { ecosystemType: "PRODUCT", site: { id: "claudia-calero", domain: "claudiacalero.pro" },
    hero: { desktop } };
  const business = { version: 2, ownerKey: owner, siteId: "claudia-calero-business", ecosystemType: "BUSINESS",
    baseDomain: "claudiacalero.pro", publicHost: "negocio.claudiacalero.pro" };
  const saveLead = (value: unknown) => write(join(activation, "leads.json"), [value]);
  const saveSource = (value: unknown, siteId = "claudia-calero") => write(join(sources, `${siteId}.json`), value);
  const saveTarget = (value: typeof business, filename = value.siteId) => write(join(targets, `${filename}.json`), value);
  await Promise.all([saveLead(lead), saveSource(source), saveTarget(business)]);
  return { sources, activation, lead, source, business, saveLead, saveSource, saveTarget,
    resolve: () => businessProductHeroCorrelationService.resolveForBusinessSite("claudia-calero-business") };
}

test("legacy Product hero follows the Business owner's authoritative activation lead without changing source", async (t) => {
  const fx = await fixture(t);
  const before = await readFile(join(fx.sources, "claudia-calero.json"), "utf8");
  assert.deepEqual(await fx.resolve(), { desktop, mobile: undefined });
  assert.equal(await readFile(join(fx.sources, "claudia-calero.json"), "utf8"), before);
});

test("legacy Product accepts the owner's canonical product host", async (t) => {
  const fx = await fixture(t);
  await fx.saveSource({ ...fx.source, site: { id: "claudia-calero", domain: "producto.claudiacalero.pro" } });
  assert.equal((await fx.resolve()).desktop, desktop);
});

test("foreign lead, source identity, domain and non-Product sources cannot supply a legacy poster", async (t) => {
  const fx = await fixture(t);
  await fx.saveLead({ ...fx.lead, id: foreign });
  assert.deepEqual(await fx.resolve(), {});
  await fx.saveLead(fx.lead);
  for (const source of [
    { ...fx.source, site: { id: "other-partner", domain: "claudiacalero.pro" } },
    { ...fx.source, site: { id: "claudia-calero", domain: "another.pro" } },
    { ...fx.source, ecosystemType: "BUSINESS" },
    { ...fx.source, ecosystemType: undefined }
  ]) {
    await fx.saveSource(source);
    assert.deepEqual(await fx.resolve(), {});
  }
});

test("conflicting inventory ownership prevents legacy source access", async (t) => {
  const fx = await fixture(t);
  await fx.saveTarget({ ...fx.business, siteId: "claudia-calero", ecosystemType: "PRODUCT", ownerKey: foreign });
  assert.deepEqual(await fx.resolve(), {});
});

test("ambiguous same-owner Product targets do not pick a source or fall back", async (t) => {
  const fx = await fixture(t);
  await fx.saveSource({ ...fx.source, site: { id: "claudia-product", domain: "producto.claudiacalero.pro" } }, "claudia-product");
  await fx.saveSource({ ...fx.source, site: { id: "claudia-product-other", domain: "producto.claudiacalero.pro" } }, "claudia-product-other");
  await fx.saveTarget({ ...fx.business, siteId: "claudia-product", ecosystemType: "PRODUCT" });
  await fx.saveTarget({ ...fx.business, siteId: "claudia-product-other", ecosystemType: "PRODUCT" });
  assert.deepEqual(await fx.resolve(), {});
});

test("normal same-owner Product inventory target keeps precedence over legacy source", async (t) => {
  const fx = await fixture(t);
  const current = "https://cdn.example/current-product.webp";
  await fx.saveSource({ ...fx.source, site: { id: "claudia-product", domain: "producto.claudiacalero.pro" },
    hero: { desktop: current } }, "claudia-product");
  await fx.saveTarget({ ...fx.business, siteId: "claudia-product", ecosystemType: "PRODUCT" });
  assert.equal((await fx.resolve()).desktop, current);
});

test("an existing Product inventory target with missing source cannot be bypassed by legacy fallback", async (t) => {
  const fx = await fixture(t);
  await fx.saveTarget({ ...fx.business, siteId: "missing-product", ecosystemType: "PRODUCT" });
  assert.deepEqual(await fx.resolve(), {});
});

test("duplicate Business target identities prevent choosing either owner", async (t) => {
  const fx = await fixture(t);
  await fx.saveTarget({ ...fx.business, ownerKey: foreign }, "duplicate-business");
  assert.deepEqual(await fx.resolve(), {});
});

test("foreign Product inventory cannot replace the authoritative legacy source", async (t) => {
  const fx = await fixture(t);
  await fx.saveTarget({ ...fx.business, siteId: "foreign-product", ownerKey: foreign, ecosystemType: "PRODUCT" });
  await fx.saveSource({ ...fx.source, site: { id: "foreign-product", domain: "foreign.pro" },
    hero: { desktop: "https://cdn.example/foreign.webp" } }, "foreign-product");
  assert.equal((await fx.resolve()).desktop, desktop);
});

test("missing lead, missing Business inventory and mismatched assigned domain fail closed", async (t) => {
  const fx = await fixture(t);
  await fx.saveLead({ ...fx.lead, onboardingData: { domain: "foreign.pro" } });
  assert.deepEqual(await fx.resolve(), {});
  await fx.saveLead({ ...fx.lead, siteId: null });
  assert.deepEqual(await fx.resolve(), {});
  await rm(join(fx.activation, "leads.json"));
  assert.deepEqual(await fx.resolve(), {});
  await fx.saveLead(fx.lead);
  await rm(join(fx.sources, ".publishing-targets", "claudia-calero-business.json"));
  assert.deepEqual(await fx.resolve(), {});
});
