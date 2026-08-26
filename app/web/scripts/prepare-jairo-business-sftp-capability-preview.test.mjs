import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { prepareJairoBusinessSftpCapabilityPreview } from "./prepare-jairo-business-sftp-capability-preview.mjs";

const target = {
  version: 2,
  ownerKey: "f403f29e-95c8-4825-9320-967376443020",
  siteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  rootEcosystemType: "PERSONAL_BRAND",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro",
  remoteRoot: "/hosting/negocio",
  provisioningState: "READY",
  publicationState: "PENDING"
};
const environment = {
  HOSTINGER_SFTP_HOST: "sftp.example.test",
  HOSTINGER_SFTP_PORT: "22",
  HOSTINGER_SFTP_USERNAME: "u123456789",
  HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=`
};

async function fixture(value = target) {
  const root = await mkdtemp(resolve(tmpdir(), "business-sftp-preview-"));
  const sources = resolve(root, "sources");
  const inputParent = resolve(root, "inputs");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true });
  await mkdir(inputParent);
  await writeFile(resolve(sources, ".publishing-targets", "jairo-pinto-business.json"), `${JSON.stringify(value, null, 2)}\n`);
  return { sources, inputParent };
}

test("creates the exact manifest and executes PREVIEW without an adapter or provider call", async () => {
  const fx = await fixture();
  const result = await prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: fx.sources, inputParent: fx.inputParent, environment });
  assert.equal(result.changed, true);
  assert.equal(result.preview.blocked, false);
  assert.equal(result.preview.changed, false);
  assert.equal(result.preview.safety.adapterCreated, false);
  assert.equal(result.preview.safety.providerCallsMade, false);
  assert.equal(result.preview.planMaterial.remoteRoot, target.remoteRoot);
  const manifest = JSON.parse(await readFile(resolve(result.inputs.directory, "manifest.json")));
  assert.equal(manifest.allowlist.length, 1);
  assert.equal(manifest.allowlist[0].siteId, target.siteId);
  assert.equal("password" in manifest.allowlist[0], false);
});

test("creates the fixed local input parent when it is absent", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "business-sftp-preview-parent-"));
  const sources = resolve(root, "sources");
  const inputParent = resolve(root, "missing", "publication-inputs");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true });
  await writeFile(resolve(sources, ".publishing-targets", "jairo-pinto-business.json"), `${JSON.stringify(target, null, 2)}\n`);
  const result = await prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: sources, inputParent, environment });
  assert.equal(result.changed, true);
  assert.equal(result.preview.blocked, false);
  assert.equal(JSON.parse(await readFile(resolve(result.inputs.directory, "manifest.json"))).allowlist[0].siteId, target.siteId);
});

test("reuses only the exact manifest and preserves the reviewed plan hash", async () => {
  const fx = await fixture();
  const first = await prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: fx.sources, inputParent: fx.inputParent, environment });
  const second = await prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: fx.sources, inputParent: fx.inputParent, environment });
  assert.equal(second.changed, false);
  assert.equal(second.inputs.reused, true);
  assert.equal(second.preview.planHash, first.preview.planHash);
});

test("reports missing SFTP binding in PREVIEW without connecting", async () => {
  const fx = await fixture();
  const result = await prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: fx.sources, inputParent: fx.inputParent, environment: {} });
  assert.equal(result.preview.blocked, true);
  assert.ok(result.preview.blockedReasons.includes("SFTP_HOST_MISSING"));
  assert.equal(result.preview.safety.providerCallsMade, false);
});

test("blocks target drift, staging residue and foreign input contents", async () => {
  const invalid = await fixture({ ...target, provisioningState: "FAILED" });
  await assert.rejects(() => prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: invalid.sources, inputParent: invalid.inputParent, environment }), /TARGET_STATE_INVALID/);

  const staging = await fixture();
  await mkdir(resolve(staging.inputParent, ".CDX-20260824-006.staging"));
  await assert.rejects(() => prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: staging.sources, inputParent: staging.inputParent, environment }), /CAPABILITY_STAGING_RESIDUE/);

  const foreign = await fixture();
  const input = resolve(foreign.inputParent, "CDX-20260824-006");
  await mkdir(input);
  await writeFile(resolve(input, "foreign"), "x");
  await assert.rejects(() => prepareJairoBusinessSftpCapabilityPreview({ sourceDirectory: foreign.sources, inputParent: foreign.inputParent, environment }), /CAPABILITY_INPUT_DIRECTORY_NOT_REUSABLE/);
});
