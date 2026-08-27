import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  PREPARE_CONFIRMATION,
  PREPARE_MODE,
  planPackagePreparation,
  prepareCapabilityPreview,
  preparePackageAndPublicationPreview
} from "./prepare-jairo-business-publication-preview.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (path) => access(path).then(() => true, () => false);

function packageConfig(source) {
  const digits = source.distributor.whatsappNumber.replace(/\D/g, "");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(source.distributor.defaultMessage)}`;
  return {
    ecosystemType: "BUSINESS",
    site: source.site,
    distributor: {},
    vsl: source.vsl,
    cta: { primaryUrl: url, secondaryUrl: url, directRegisterUrl: "" }
  };
}

async function writePackage(directory, source, marker = "generated") {
  await mkdir(directory, { recursive: true });
  const files = {
    "index.html": `<html>${marker}</html>`,
    "styles.css": "body{}",
    "app.js": "void 0;",
    "config.js": `const CONFIG = ${JSON.stringify(packageConfig(source))};\n`,
    "favicon.svg": "<svg></svg>"
  };
  await Promise.all(Object.entries(files).map(([name, value]) => writeFile(resolve(directory, name), value)));
}

async function fixture({ withCapability = true, withExistingPackage = false } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-publication-preview-"));
  const sourceDirectory = resolve(root, "sources");
  const targetDirectory = resolve(sourceDirectory, ".publishing-targets");
  const outputDirectory = resolve(root, "output");
  const inputParent = resolve(root, "inputs");
  const inputDirectory = resolve(inputParent, "CDX-20260827-001");
  const activationDirectory = resolve(root, "activation");
  const paymentDirectory = resolve(root, "payments");
  const grantDirectory = resolve(root, "grants");
  const journalDirectory = resolve(root, "journals");
  const claimDirectory = resolve(root, "claims", "jairo-pinto-business");
  await Promise.all([
    mkdir(targetDirectory, { recursive: true }), mkdir(resolve(outputDirectory, "ganomaster-business"), { recursive: true }),
    mkdir(activationDirectory), mkdir(paymentDirectory), mkdir(grantDirectory), mkdir(journalDirectory), mkdir(inputParent)
  ]);
  const source = {
    ecosystemType: "BUSINESS",
    site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" },
    distributor: { whatsappNumber: "573188430283", defaultMessage: "Hola Jairo" },
    vsl: { embedUrl: "https://media.example/business.mp4", thumbnailUrl: "https://media.example/poster.webp" }
  };
  const brand = { ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto" } };
  const product = { ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product" }, hero: { desktop: "https://media.example/poster.webp" } };
  const target = {
    version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    siteId: "jairo-pinto-business",
    ecosystemType: "BUSINESS",
    baseDomain: "jairopinto.pro",
    publicHost: "negocio.jairopinto.pro",
    remoteRoot: "/hosting/negocio",
    provisioningState: "READY",
    publicationState: "PENDING"
  };
  const sourceBytes = json(source);
  const brandBytes = json(brand);
  const productBytes = json(product);
  const targetBytes = json(target);
  await Promise.all([
    writeFile(resolve(sourceDirectory, "jairo-pinto-business.json"), sourceBytes),
    writeFile(resolve(sourceDirectory, "jairo-pinto.json"), brandBytes),
    writeFile(resolve(sourceDirectory, "jairo-pinto-product.json"), productBytes),
    writeFile(resolve(targetDirectory, "jairo-pinto-business.json"), targetBytes),
    writeFile(resolve(outputDirectory, "ganomaster-business", "index.html"), "master"),
    writeFile(resolve(activationDirectory, "leads.json"), json([{ id: target.ownerKey, siteId: "jairo-pinto", publicationState: "NOT_STARTED" }]))
  ]);
  if (withExistingPackage) await writePackage(resolve(outputDirectory, "jairo-pinto-business"), source, "old");
  const environment = {
    HOSTINGER_SFTP_HOST: "sftp.example.test",
    HOSTINGER_SFTP_PORT: "22",
    HOSTINGER_SFTP_USERNAME: "u123456789",
    HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=`
  };
  const contract = {
    ownerKey: target.ownerKey,
    ownerSiteId: "jairo-pinto",
    productSiteId: "jairo-pinto-product",
    siteId: target.siteId,
    ecosystemType: target.ecosystemType,
    baseDomain: target.baseDomain,
    publicHost: target.publicHost,
    sourceHash: sha(sourceBytes),
    brandHash: sha(brandBytes),
    productHash: sha(productBytes)
  };
  if (withCapability) {
    await mkdir(inputDirectory);
    const capability = {
      schemaVersion: 1,
      probeVersion: "partnerhub-sftp-sibling-rename-v1",
      status: "VERIFIED",
      connection: { host: environment.HOSTINGER_SFTP_HOST, port: 22, hostKeyFingerprintSha256: environment.HOSTINGER_SFTP_HOST_KEY_SHA256, usernameHash: sha(environment.HOSTINGER_SFTP_USERNAME) },
      scope: { parentDirectory: "/hosting", remoteRoot: target.remoteRoot },
      evidence: {
        stagePath: "/hosting/.capability-stage",
        destinationPath: "/hosting/.capability-destination",
        backupPath: "/hosting/.capability-backup",
        sameFilesystemDirectoryRename: true,
        backupRestoreReadback: true,
        cleanupVerified: true,
        targetIntact: true
      },
      verifiedAt: "2026-08-27T12:00:00.000Z",
      ttlSeconds: 3600
    };
    await writeFile(resolve(inputDirectory, "sftp-capability.json"), json(capability));
  }
  const options = {
    sourceDirectory,
    outputDirectory,
    inputParent,
    activationDirectory,
    paymentDirectory,
    grantDirectory,
    journalDirectory,
    claimDirectory,
    environment,
    contract,
    now: new Date("2026-08-27T12:15:00.000Z")
  };
  return { ...options, root, inputDirectory, source, target, sourceBytes, targetBytes };
}

test("creates one fresh capability manifest and returns a provider-free PREVIEW", async () => {
  const fx = await fixture({ withCapability: false });
  const first = await prepareCapabilityPreview(fx);
  assert.equal(first.changed, true);
  assert.equal(first.providerCallsMade, false);
  assert.equal(first.preview.blocked, false);
  assert.equal(first.preview.safety.adapterCreated, false);
  const second = await prepareCapabilityPreview(fx);
  assert.equal(second.changed, false);
  assert.equal(second.preview.planHash, first.preview.planHash);
});

test("package preparation PREVIEW is read-only and binds every local/provider input", async () => {
  const fx = await fixture();
  const result = await planPackagePreparation(fx);
  assert.equal(result.changed, false);
  assert.equal(result.blocked, false);
  assert.equal(result.planMaterial.existingPackageHash, "ABSENT");
  assert.equal(result.safety.providerCallsMade, false);
  assert.equal(result.safety.localWritesMade, false);
  assert.match(result.planHash, /^[0-9a-f]{64}$/);
});

test("blocks expired capability and protected source drift", async () => {
  const expired = await fixture();
  expired.now = new Date("2026-08-27T14:00:01.000Z");
  assert.ok((await planPackagePreparation(expired)).blockedReasons.includes("SFTP_CAPABILITY_EXPIRED"));
  const drift = await fixture();
  await writeFile(resolve(drift.sourceDirectory, "jairo-pinto-product.json"), "{}\n");
  assert.ok((await planPackagePreparation(drift)).blockedReasons.includes("PROTECTED_PRODUCT_HASH_DRIFT"));
});

test("preparation requires the exact confirmation and reviewed plan hash", async () => {
  const fx = await fixture();
  const preview = await planPackagePreparation(fx);
  await assert.rejects(() => preparePackageAndPublicationPreview({ ...fx, expectedPlanHash: preview.planHash }), /PREPARE_REQUIRES_CONFIRMATION/);
  await assert.rejects(() => preparePackageAndPublicationPreview({ ...fx, confirmation: PREPARE_CONFIRMATION, expectedPlanHash: "0".repeat(64) }), /PREPARATION_PLAN_HASH_MISMATCH/);
});

test("isolates generator side effects, installs the package and returns unblocked publication PREVIEW", async () => {
  const fx = await fixture();
  const sourceBefore = await readFile(resolve(fx.sourceDirectory, "jairo-pinto-business.json"));
  const activationBefore = await readFile(resolve(fx.activationDirectory, "leads.json"));
  const targetBefore = await readFile(resolve(fx.sourceDirectory, ".publishing-targets", "jairo-pinto-business.json"));
  const preview = await planPackagePreparation(fx);
  const generator = async (workspace) => {
    await writeFile(resolve(workspace.sourceDirectory, "jairo-pinto-business.json"), "isolated mutation");
    await writeFile(resolve(workspace.activationDirectory, "leads.json"), "isolated mutation");
    await writePackage(resolve(workspace.outputDirectory, "jairo-pinto-business"), fx.source);
  };
  const result = await preparePackageAndPublicationPreview({
    ...fx,
    mode: PREPARE_MODE,
    confirmation: PREPARE_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    generator
  });
  assert.equal(result.changed, true);
  assert.equal(result.providerCallsMade, false);
  assert.equal(result.publicationPreview.blocked, false);
  assert.match(result.publicationPreview.planHash, /^[0-9a-f]{64}$/);
  assert.equal(await readFile(resolve(fx.sourceDirectory, "jairo-pinto-business.json"), "utf8"), sourceBefore.toString());
  assert.equal(await readFile(resolve(fx.activationDirectory, "leads.json"), "utf8"), activationBefore.toString());
  assert.equal(await readFile(resolve(fx.sourceDirectory, ".publishing-targets", "jairo-pinto-business.json"), "utf8"), targetBefore.toString());
  assert.equal(await exists(resolve(fx.inputDirectory, "manifest.json")), true);
  assert.equal(await exists(resolve(fx.inputDirectory, "preparation.json")), true);
  assert.equal(await exists(fx.claimDirectory), false);
});

test("invalid generated package fails before replacing an existing package and cleans its claim", async () => {
  const fx = await fixture({ withExistingPackage: true });
  const oldIndex = await readFile(resolve(fx.outputDirectory, "jairo-pinto-business", "index.html"), "utf8");
  const preview = await planPackagePreparation(fx);
  const generator = async (workspace) => {
    const directory = resolve(workspace.outputDirectory, "jairo-pinto-business");
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "index.html"), "invalid");
  };
  await assert.rejects(() => preparePackageAndPublicationPreview({
    ...fx,
    confirmation: PREPARE_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    generator
  }), /PUBLICATION_PREVIEW_BLOCKED/);
  assert.equal(await readFile(resolve(fx.outputDirectory, "jairo-pinto-business", "index.html"), "utf8"), oldIndex);
  assert.equal(await exists(fx.claimDirectory), false);
});

test("rolls back the previous package when the installed PREVIEW detects drift", async () => {
  const fx = await fixture({ withExistingPackage: true });
  const oldIndex = await readFile(resolve(fx.outputDirectory, "jairo-pinto-business", "index.html"), "utf8");
  const preview = await planPackagePreparation(fx);
  const generator = async (workspace) => writePackage(resolve(workspace.outputDirectory, "jairo-pinto-business"), fx.source);
  await assert.rejects(() => preparePackageAndPublicationPreview({
    ...fx,
    confirmation: PREPARE_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    generator,
    hooks: {
      afterPackageInstall: async ({ packageDirectory }) => writeFile(resolve(packageDirectory, "config.js"), "invalid")
    }
  }), /INSTALLED_PUBLICATION_PREVIEW_DRIFT/);
  assert.equal(await readFile(resolve(fx.outputDirectory, "jairo-pinto-business", "index.html"), "utf8"), oldIndex);
  assert.equal(await exists(fx.claimDirectory), false);
  assert.equal(await exists(resolve(fx.inputDirectory, "manifest.json")), false);
  assert.equal(await exists(resolve(fx.inputDirectory, "preparation.json")), false);
});
