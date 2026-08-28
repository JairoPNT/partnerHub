import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  APPLY_MODE,
  applyExpiredSftpCapabilityRenewal,
  planExpiredSftpCapabilityRenewal
} from "./jairo-business-sftp-capability-renewal.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (path) => access(path).then(() => true, () => false);

async function fixture({ verifiedAt = "2026-08-27T12:00:00.000Z" } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-sftp-capability-renewal-"));
  const inputParent = resolve(root, "inputs");
  const inputDirectory = resolve(inputParent, "CDX-20260827-001");
  const sourceDirectory = resolve(root, "sources");
  const targetDirectory = resolve(sourceDirectory, ".publishing-targets");
  await Promise.all([mkdir(inputDirectory, { recursive: true }), mkdir(targetDirectory, { recursive: true })]);
  const environment = {
    HOSTINGER_SFTP_HOST: "sftp.example.test",
    HOSTINGER_SFTP_PORT: "22",
    HOSTINGER_SFTP_USERNAME: "u123456789",
    HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=`
  };
  const target = {
    version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    siteId: "jairo-pinto-business",
    ecosystemType: "BUSINESS",
    baseDomain: "jairopinto.pro",
    publicHost: "negocio.jairopinto.pro",
    provisioningState: "READY",
    publicationState: "PENDING",
    remoteRoot: "/home/example/public_html/negocio"
  };
  const targetBytes = json(target);
  await writeFile(resolve(targetDirectory, "jairo-pinto-business.json"), targetBytes);
  const probeToken = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const parentDirectory = "/home/example/public_html";
  const path = (kind) => `${parentDirectory}/.partnerhub-capability-${kind}-${probeToken}`;
  const manifest = {
    confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY",
    allowlist: [{
      ownerKey: target.ownerKey,
      siteId: target.siteId,
      ecosystemType: target.ecosystemType,
      baseDomain: target.baseDomain,
      publicHost: target.publicHost,
      expectedTargetHash: sha256(targetBytes),
      remoteRoot: target.remoteRoot,
      parentDirectory,
      probeToken,
      paths: { claim: path("claim"), stage: path("stage"), destination: path("destination"), backup: path("backup") },
      canaryHex: "ab".repeat(32),
      ttlSeconds: 3600
    }]
  };
  await writeFile(resolve(inputDirectory, "sftp-probe-manifest.json"), json(manifest));
  const capability = {
    schemaVersion: 1,
    probeVersion: "partnerhub-sftp-sibling-rename-v1",
    status: "VERIFIED",
    connection: {
      host: environment.HOSTINGER_SFTP_HOST,
      port: 22,
      hostKeyFingerprintSha256: environment.HOSTINGER_SFTP_HOST_KEY_SHA256,
      usernameHash: sha256(environment.HOSTINGER_SFTP_USERNAME)
    },
    scope: { parentDirectory, remoteRoot: target.remoteRoot },
    evidence: {
      stagePath: path("stage"),
      destinationPath: path("destination"),
      backupPath: path("backup"),
      sameFilesystemDirectoryRename: true,
      backupRestoreReadback: true,
      cleanupVerified: true,
      targetIntact: true
    },
    verifiedAt,
    ttlSeconds: 3600,
    probeToken
  };
  const capabilityBytes = json(capability);
  const expectedCapabilityHash = sha256(capabilityBytes);
  const capabilityPath = resolve(inputDirectory, "sftp-capability.json");
  await writeFile(capabilityPath, capabilityBytes);
  return {
    root,
    inputParent,
    inputDirectory,
    sourceDirectory,
    environment,
    expectedCapabilityHash,
    capabilityPath,
    capabilityBytes,
    now: new Date("2026-08-27T14:00:00.000Z")
  };
}

test("PREVIEW binds exact expired evidence and performs no provider operation", async () => {
  const fx = await fixture();
  const result = await planExpiredSftpCapabilityRenewal(fx);
  assert.equal(result.mode, "PREVIEW");
  assert.equal(result.changed, false);
  assert.equal(result.blocked, false);
  assert.equal(result.disposition, "ARCHIVE_EXPIRED_CAPABILITY");
  assert.equal(result.evidence.expired, true);
  assert.equal(result.safety.providerCallsMade, false);
  assert.equal(result.safety.remoteWritesMade, false);
  assert.match(result.planHash, /^[0-9a-f]{64}$/);
});

test("PREVIEW blocks evidence that is still fresh", async () => {
  const fx = await fixture({ verifiedAt: "2026-08-27T13:30:00.000Z" });
  const result = await planExpiredSftpCapabilityRenewal(fx);
  assert.equal(result.blocked, true);
  assert.ok(result.blockedReasons.includes("SFTP_CAPABILITY_NOT_EXPIRED"));
});

test("PREVIEW blocks a capability hash different from the reviewed evidence", async () => {
  const fx = await fixture();
  const result = await planExpiredSftpCapabilityRenewal({ ...fx, expectedCapabilityHash: "0".repeat(64) });
  assert.equal(result.blocked, true);
  assert.ok(result.blockedReasons.includes("SFTP_CAPABILITY_HASH_DRIFT"));
});

test("APPLY requires exact mode, confirmation and plan hash", async () => {
  const fx = await fixture();
  const preview = await planExpiredSftpCapabilityRenewal(fx);
  await assert.rejects(() => applyExpiredSftpCapabilityRenewal({ ...fx, mode: "PREVIEW", confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }), /APPLY_MODE_REQUIRED/);
  await assert.rejects(() => applyExpiredSftpCapabilityRenewal({ ...fx, mode: APPLY_MODE, confirmation: "WRONG", expectedPlanHash: preview.planHash }), /CONFIRMATION_REQUIRED/);
  await assert.rejects(() => applyExpiredSftpCapabilityRenewal({ ...fx, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) }), /PLAN_HASH_MISMATCH/);
});

test("APPLY archives bytes exactly and returns the next provider-free probe PREVIEW", async () => {
  const fx = await fixture();
  const preview = await planExpiredSftpCapabilityRenewal(fx);
  const result = await applyExpiredSftpCapabilityRenewal({
    ...fx,
    mode: APPLY_MODE,
    confirmation: APPLY_CONFIRMATION,
    expectedPlanHash: preview.planHash
  });
  assert.equal(result.outcome, "ARCHIVED_FOR_RENEWAL");
  assert.equal(result.changed, true);
  assert.equal(result.nextProbePreview.blocked, false);
  assert.equal(result.nextProbePreview.safety.providerCallsMade, false);
  assert.equal(await exists(fx.capabilityPath), false);
  assert.equal((await readFile(resolve(result.archive.directory, "sftp-capability.json"))).toString("utf8"), fx.capabilityBytes);
  assert.equal(sha256(await readFile(resolve(result.archive.directory, "sftp-capability.json"))), fx.expectedCapabilityHash);
  assert.equal(await exists(resolve(fx.inputParent, ".capability-renewal-claim-CDX-20260827-003")), false);
});

test("rerunning the same authorized APPLY is idempotent", async () => {
  const fx = await fixture();
  const preview = await planExpiredSftpCapabilityRenewal(fx);
  const options = { ...fx, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash };
  await applyExpiredSftpCapabilityRenewal(options);
  const result = await applyExpiredSftpCapabilityRenewal(options);
  assert.equal(result.outcome, "ALREADY_ARCHIVED");
  assert.equal(result.changed, false);
  assert.equal(result.planHash, preview.planHash);
});

test("PREVIEW blocks when active and archived evidence coexist", async () => {
  const fx = await fixture();
  const archive = resolve(fx.inputParent, ".capability-archives", "CDX-20260827-003", fx.expectedCapabilityHash);
  await mkdir(archive, { recursive: true });
  await writeFile(resolve(archive, "sftp-capability.json"), fx.capabilityBytes);
  await writeFile(resolve(archive, "archive.json"), json({ requestId: "CDX-20260827-003", sourceInputId: "CDX-20260827-001", capabilityHash: fx.expectedCapabilityHash }));
  const result = await planExpiredSftpCapabilityRenewal(fx);
  assert.equal(result.blocked, true);
  assert.ok(result.blockedReasons.includes("SFTP_CAPABILITY_ACTIVE_AND_ARCHIVE_COLLISION"));
});
