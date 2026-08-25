import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  planDynamicRecovery,
  RECOVERY_CONFIRMATION,
  RECOVERY_MODE,
  runDynamicRecovery,
} from "./jairo-business-provisioning-dynamic-recovery.mjs";

const text = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => createHash("sha256").update(value).digest("hex");

async function present(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-dynamic-recovery-"));
  const sourceDirectory = resolve(root, "sources");
  const inputDirectory = resolve(root, "inputs");
  const stateDirectory = resolve(root, "state");
  const targetsDirectory = resolve(sourceDirectory, ".publishing-targets");
  const claimDirectory = resolve(stateDirectory, "claim");
  await mkdir(targetsDirectory, { recursive: true });
  await mkdir(inputDirectory);
  await mkdir(claimDirectory, { recursive: true });

  const sourceBytes = text({
    site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" },
    ecosystemType: "BUSINESS",
  });
  await writeFile(resolve(sourceDirectory, "jairo-pinto-business.json"), sourceBytes);

  const entitlementBytes = text({
    activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
    commercialState: "KNOWN",
    includedEcosystems: ["BUSINESS"],
    expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }],
    rootRedirectApex: { preserved: true, isPublishingTarget: false },
  });
  await writeFile(resolve(inputDirectory, "entitlement.json"), entitlementBytes);

  const manifestPath = resolve(inputDirectory, "manifest.json");
  await writeFile(manifestPath, text({
    confirmation: "PREVIEW_JAIRO_BUSINESS_PROVISIONING",
    allowlist: [{
      ownerKey: "f403f29e-95c8-4825-9320-967376443020",
      siteId: "jairo-pinto-business",
      ecosystemType: "BUSINESS",
      rootEcosystemType: "PERSONAL_BRAND",
      baseDomain: "jairopinto.pro",
      publicHost: "negocio.jairopinto.pro",
      expectedSourceHash: sha(sourceBytes),
      expectedEntitlementHash: sha(entitlementBytes),
    }],
  }));

  const failed = {
    version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    siteId: "jairo-pinto-business",
    ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "jairopinto.pro",
    publicHost: "negocio.jairopinto.pro",
    remoteRoot: "/domains/negocio/public_html",
    provisioningState: "FAILED",
    publicationState: "PENDING",
    hostingerState: "READY",
    dnsState: "PENDING",
    sslState: "PENDING",
  };
  const targetPath = resolve(targetsDirectory, "jairo-pinto-business.json");
  await writeFile(targetPath, text(failed));

  const originalPlanHash = "7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf";
  await writeFile(resolve(claimDirectory, "owner.json"), text({
    token: "retained-owner-token",
    planHash: originalPlanHash,
    acquiredAt: "2026-08-25T16:14:08.170Z",
  }));

  return {
    sourceDirectory,
    manifestPath,
    stateDirectory,
    targetPath,
    originalPlanHash,
    environment: {
      HOSTINGER_API_TOKEN: "provider-secret",
      HOSTINGER_API_USERNAME: "u123",
      PARTNERHUB_PROVISIONING_IPV4: "82.29.157.103",
    },
    failed,
  };
}

test("PREVIEW dynamically binds current retained target without provider calls or writes", async () => {
  const values = await fixture();
  const preview = await planDynamicRecovery(values);
  assert.equal(preview.mode, "PREVIEW_DYNAMIC_RECOVERY");
  assert.equal(preview.blocked, false);
  assert.equal(preview.changed, false);
  assert.equal(preview.planMaterial.currentTargetHash, sha(text(values.failed)));
  assert.equal(preview.safety.providerCallsMade, false);
  assert.equal(preview.safety.localWritesMade, false);
  assert.equal(preview.claim.ownerTokenRedacted, true);
});

test("recovery requires exact confirmation and current plan hash before provider invocation", async () => {
  const values = await fixture();
  const preview = await planDynamicRecovery(values);
  let providerCalls = 0;
  const provisioner = async () => { providerCalls += 1; };
  await assert.rejects(
    () => runDynamicRecovery({ ...values, mode: RECOVERY_MODE, expectedPlanHash: preview.planHash, provisioner }),
    /RECOVERY_REQUIRES_CONFIRMATION/,
  );
  await assert.rejects(
    () => runDynamicRecovery({ ...values, mode: RECOVERY_MODE, confirmation: RECOVERY_CONFIRMATION, expectedPlanHash: "f".repeat(64), provisioner }),
    /RECOVERY_PLAN_HASH_MISMATCH/,
  );
  assert.equal(providerCalls, 0);
});

test("provider rejection exposes only normalized code and status while preserving claim", async () => {
  const values = await fixture();
  const preview = await planDynamicRecovery(values);
  const error = Object.assign(new Error("secret provider body token=do-not-print"), {
    providerCode: "HOSTINGER_DNS_PROVIDER_FAILED",
    providerStatus: 500,
  });
  const result = await runDynamicRecovery({
    ...values,
    mode: RECOVERY_MODE,
    confirmation: RECOVERY_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    provisioner: async () => { throw error; },
  });
  assert.equal(result.outcome, "PROVIDER_REJECTED");
  assert.deepEqual(result.provider, { code: "HOSTINGER_DNS_PROVIDER_FAILED", httpStatus: 500 });
  assert.equal(JSON.stringify(result).includes("do-not-print"), false);
  assert.equal(await present(resolve(values.stateDirectory, "claim")), true);
  assert.equal(await present(resolve(values.stateDirectory, "apply.json")), false);
});

test("pending readiness preserves claim and forces a new preview bound to new target bytes", async () => {
  const values = await fixture();
  const preview = await planDynamicRecovery(values);
  const pending = { ...values.failed, provisioningState: "DNS_PENDING", dnsState: "CREATED" };
  const result = await runDynamicRecovery({
    ...values,
    mode: RECOVERY_MODE,
    confirmation: RECOVERY_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    provisioner: async () => { await writeFile(values.targetPath, text(pending)); },
  });
  assert.equal(result.outcome, "PENDING_READINESS");
  assert.equal(await present(resolve(values.stateDirectory, "claim")), true);
  const nextPreview = await planDynamicRecovery(values);
  assert.notEqual(nextPreview.planHash, preview.planHash);
  assert.equal(nextPreview.planMaterial.currentTargetHash, sha(text(pending)));
});

test("READY result writes terminal journal and removes only the retained claim", async () => {
  const values = await fixture();
  const preview = await planDynamicRecovery(values);
  const ready = { ...values.failed, provisioningState: "READY", dnsState: "RESOLVED", sslState: "READY" };
  const result = await runDynamicRecovery({
    ...values,
    mode: RECOVERY_MODE,
    confirmation: RECOVERY_CONFIRMATION,
    expectedPlanHash: preview.planHash,
    provisioner: async () => { await writeFile(values.targetPath, text(ready)); },
  });
  assert.equal(result.outcome, "APPLIED");
  assert.equal(await present(resolve(values.stateDirectory, "claim")), false);
  const journal = JSON.parse(await readFile(resolve(values.stateDirectory, "apply.json"), "utf8"));
  assert.equal(journal.recoveryPlanHash, preview.planHash);
  assert.equal(journal.targetHash, sha(text(ready)));
});
