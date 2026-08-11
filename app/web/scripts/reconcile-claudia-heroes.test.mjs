import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { reconcileClaudiaHeroes, reconcilePartnerHeroes } from "./reconcile-claudia-heroes.mjs";

const desktop = "https://media.partnerhub.club/clientes/claudia-calero/producto/v1/hero-desktop.webp";
const mobile = "https://media.partnerhub.club/clientes/claudia-calero/producto/v1/hero-mobile.webp";

async function fixture({ source = {}, leads } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "partnerhub-claudia-reconcile-"));
  const sourceDirectory = resolve(root, "sources");
  const activationDirectory = resolve(root, "activation");
  await Promise.all([mkdir(sourceDirectory), mkdir(activationDirectory)]);
  await writeFile(
    resolve(sourceDirectory, "claudia-calero.json"),
    JSON.stringify({ hero: { desktop, mobile }, ...source }),
    "utf8"
  );
  await writeFile(
    resolve(activationDirectory, "leads.json"),
    JSON.stringify(leads ?? [
      {
        id: "claudia-id",
        siteId: "claudia-calero",
        onboardingData: { sourcePhotos: ["https://media.partnerhub.club/source.webp"], operatorNotes: "keep" },
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      { id: "other-id", siteId: "other-partner", onboardingData: { keep: true } }
    ]),
    "utf8"
  );
  return { root, sourceDirectory, activationDirectory };
}

test("dry-run reports both heroes without writing", async () => {
  const paths = await fixture();
  try {
    const before = await readFile(resolve(paths.activationDirectory, "leads.json"), "utf8");
    const result = await reconcileClaudiaHeroes(paths);
    const after = await readFile(resolve(paths.activationDirectory, "leads.json"), "utf8");
    assert.equal(result.mode, "DRY_RUN");
    assert.equal(result.changed, true);
    assert.deepEqual(result.next, { heroDesktopUrl: desktop, heroMobileUrl: mobile });
    assert.equal(after, before);
  } finally {
    await rm(paths.root, { recursive: true, force: true });
  }
});

test("apply changes only Claudia hero fields and creates an exact backup", async () => {
  const paths = await fixture();
  const now = new Date("2026-08-11T15:00:00.000Z");
  try {
    const before = await readFile(resolve(paths.activationDirectory, "leads.json"), "utf8");
    const result = await reconcileClaudiaHeroes({ ...paths, apply: true, now });
    const leads = JSON.parse(await readFile(resolve(paths.activationDirectory, "leads.json"), "utf8"));
    assert.equal(result.mode, "APPLY");
    assert.equal(await readFile(result.backupPath, "utf8"), before);
    assert.deepEqual(leads[0].onboardingData, {
      sourcePhotos: ["https://media.partnerhub.club/source.webp"],
      operatorNotes: "keep",
      heroDesktopUrl: desktop,
      heroMobileUrl: mobile
    });
    assert.equal(leads[0].updatedAt, now.toISOString());
    assert.deepEqual(leads[1], { id: "other-id", siteId: "other-partner", onboardingData: { keep: true } });
  } finally {
    await rm(paths.root, { recursive: true, force: true });
  }
});

test("repeated apply is an idempotent no-op without another backup", async () => {
  const paths = await fixture();
  try {
    await reconcileClaudiaHeroes({ ...paths, apply: true });
    const result = await reconcileClaudiaHeroes({ ...paths, apply: true });
    assert.equal(result.changed, false);
    assert.equal(result.backupPath, null);
  } finally {
    await rm(paths.root, { recursive: true, force: true });
  }
});

test("fails closed for invalid source heroes", async () => {
  const paths = await fixture({ source: { hero: { desktop: "http://unsafe.test/desktop.webp", mobile } } });
  try {
    await assert.rejects(reconcileClaudiaHeroes(paths), /valid HTTPS URL/);
  } finally {
    await rm(paths.root, { recursive: true, force: true });
  }
});

test("fails closed when the target lead is missing or duplicated", async () => {
  for (const leads of [[], [
    { id: "one", siteId: "claudia-calero", onboardingData: {} },
    { id: "two", siteId: "claudia-calero", onboardingData: {} }
  ]]) {
    const paths = await fixture({ leads });
    try {
      await assert.rejects(reconcileClaudiaHeroes(paths), /Expected exactly one activation lead/);
    } finally {
      await rm(paths.root, { recursive: true, force: true });
    }
  }
});

test("reconciles any valid partner siteId through the generic entry point", async () => {
  const paths = await fixture();
  const sourcePath = resolve(paths.sourceDirectory, "other-partner.json");
  const leadsPath = resolve(paths.activationDirectory, "leads.json");
  try {
    await writeFile(sourcePath, JSON.stringify({ hero: { desktop, mobile } }), "utf8");
    const leads = JSON.parse(await readFile(leadsPath, "utf8"));
    leads[1].onboardingData = {};
    await writeFile(leadsPath, JSON.stringify(leads), "utf8");
    const result = await reconcilePartnerHeroes({ ...paths, siteId: "other-partner" });
    assert.equal(result.targetSiteId, "other-partner");
    assert.equal(result.changed, true);
  } finally {
    await rm(paths.root, { recursive: true, force: true });
  }
});
