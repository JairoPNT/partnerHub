import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { preparePersonalBrandPublicationPreview } from "./prepare-jairo-personal-brand-publication-preview.mjs";

const OWNER_KEY = "f403f29e-95c8-4825-9320-967376443020";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const source = {
  ecosystemType: "PERSONAL_BRAND",
  site: { id: "jairo-pinto", appName: "jairo-pinto" }
};
const entitlement = {
  activationLeadId: OWNER_KEY,
  commercialState: "KNOWN",
  includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]
};
const target = {
  version: 2,
  ownerKey: OWNER_KEY,
  siteId: "jairo-pinto",
  ecosystemType: "PERSONAL_BRAND",
  baseDomain: "jairopinto.pro",
  publicHost: "jairopinto.pro",
  remoteRoot: "/provider-derived/non-root-directory",
  provisioningState: "READY",
  dnsState: "RESOLVED",
  sslState: "READY",
  publicationState: "PENDING"
};

async function writePackage(directory) {
  await mkdir(resolve(directory, "tipografia"), { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, ".htaccess"), "rules"),
    writeFile(resolve(directory, "app.js"), "app"),
    writeFile(resolve(directory, "config.js"), "config"),
    writeFile(resolve(directory, "favicon.svg"), "<svg/>"),
    writeFile(resolve(directory, "index.html"), "<html/>") ,
    writeFile(resolve(directory, "styles.css"), "body{}"),
    writeFile(resolve(directory, "manifest.json"), json({ schemaVersion: 1 }))
  ]);
}

async function fixture({ withTarget = true, withPackage = true } = {}) {
  const root = await mkdtemp(resolve(os.tmpdir(), "partnerhub-personal-brand-publication-"));
  const sourceDirectory = resolve(root, "sources");
  const outputDirectory = resolve(root, "output");
  const entitlementPath = resolve(root, "entitlement.json");
  await Promise.all([mkdir(sourceDirectory), mkdir(outputDirectory)]);
  await Promise.all([
    writeFile(resolve(sourceDirectory, "jairo-pinto.json"), json(source)),
    writeFile(entitlementPath, json(entitlement))
  ]);
  if (withTarget) {
    await mkdir(resolve(sourceDirectory, ".publishing-targets"));
    await writeFile(resolve(sourceDirectory, ".publishing-targets", "jairo-pinto.json"), json(target));
  }
  if (withPackage) await writePackage(resolve(outputDirectory, "ganomaster-personal-brand"));
  return {
    root, sourceDirectory, outputDirectory, entitlementPath,
    targetPath: resolve(sourceDirectory, ".publishing-targets", "jairo-pinto.json"),
    packageDirectory: resolve(outputDirectory, "ganomaster-personal-brand"),
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

test("previews a ready Personal Brand apex without mutations", async () => {
  const item = await fixture();
  try {
    const before = await Promise.all([readFile(item.targetPath), readFile(resolve(item.packageDirectory, "manifest.json"))]);
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.equal(preview.changed, false);
    assert.equal(preview.blocked, false);
    assert.equal(preview.safety.providerCallsMade, false);
    assert.equal(preview.safety.sftpAdapterCreated, false);
    assert.equal(preview.safety.localWritesMade, false);
    assert.match(preview.planHash, /^[a-f0-9]{64}$/);
    assert.equal(preview.planMaterial.identity.publicHost, "jairopinto.pro");
    assert.deepEqual(await Promise.all([readFile(item.targetPath), readFile(resolve(item.packageDirectory, "manifest.json"))]), before);
  } finally { await item.cleanup(); }
});

test("blocks an absent target without synthesizing it", async () => {
  const item = await fixture({ withTarget: false });
  try {
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_TARGET_MISSING"));
    await assert.rejects(() => lstat(item.targetPath), { code: "ENOENT" });
  } finally { await item.cleanup(); }
});

test("blocks a non-apex Personal Brand target", async () => {
  const item = await fixture();
  try {
    await writeFile(item.targetPath, json({ ...target, publicHost: "brand.jairopinto.pro" }));
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_APEX_TARGET_INVALID"));
  } finally { await item.cleanup(); }
});

for (const [name, invalidTarget] of [
  ["missing remote root", { ...target, remoteRoot: "" }],
  ["non-ready provisioning", { ...target, provisioningState: "PENDING" }],
  ["unresolved DNS", { ...target, dnsState: "PENDING" }],
  ["unready SSL", { ...target, sslState: "PENDING" }]
]) {
  test(`blocks ${name}`, async () => {
    const item = await fixture();
    try {
      await writeFile(item.targetPath, json(invalidTarget));
      const preview = await preparePersonalBrandPublicationPreview(item);
      assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_TARGET_NOT_READY"));
    } finally { await item.cleanup(); }
  });
}

test("blocks an invalid source identity", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.sourceDirectory, "jairo-pinto.json"), json({ ...source, site: { id: "wrong" } }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_SOURCE_IDENTITY_INVALID"));
  } finally { await item.cleanup(); }
});

test("blocks an entitlement without Personal Brand", async () => {
  const item = await fixture();
  try {
    await writeFile(item.entitlementPath, json({ ...entitlement, includedEcosystems: ["BUSINESS"] }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_ENTITLEMENT_INVALID"));
  } finally { await item.cleanup(); }
});

test("blocks a missing master package", async () => {
  const item = await fixture({ withPackage: false });
  try {
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_MASTER_PACKAGE_MISSING"));
  } finally { await item.cleanup(); }
});

test("blocks master-package inventory drift", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.packageDirectory, "foreign.txt"), "unexpected");
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
  } finally { await item.cleanup(); }
});

test("blocks a master package missing its required typography directory", async () => {
  const item = await fixture();
  try {
    await rm(resolve(item.packageDirectory, "tipografia"), { recursive: true, force: true });
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
  } finally { await item.cleanup(); }
});
