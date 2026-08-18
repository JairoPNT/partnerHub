import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { APPLY_CONFIRMATION, APPLY_MODE, cleanupJairoPintoTestReferrals, planReferralRelationCleanup } from "./cleanup-jairo-pinto-test-referrals.mjs";

const ids = [
  "d5748ad7-181c-4f1a-a62e-2d09696a0331",
  "43ea2f4a-1f2c-496c-85f9-9072ef471c54",
  "1e2bd92a-340e-4d34-a62c-f33c2cd0d87e"
];

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-referral-cleanup-"));
  const codes = [
    { siteId: "jairo-pinto-test", code: "7417984", displayName: "Jairo Test" },
    { siteId: "real-partner", code: "REAL123", displayName: "Real Partner" }
  ];
  const referrals = [
    { id: ids[0], referredSiteId: "jenny-varela", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "CANCELLED" },
    { id: ids[1], referredSiteId: "claudia-calero", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "CANCELLED" },
    { id: ids[2], referredSiteId: "blanca-ruiz", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "CANCELLED" },
    { id: "f30ae8ee-9af0-47e8-ab11-3debe5cc482b", referredSiteId: "real-referred", referrerSiteId: "real-partner", referrerCode: "REAL123", status: "QUALIFIED" },
    { id: "6a8d0eb0-a00b-4845-bc5f-40fcc450ac5d", referredSiteId: "code-only-match", referrerSiteId: "another-site", referrerCode: "7417984", status: "PENDING" }
  ];
  await Promise.all([
    writeFile(resolve(directory, "codes.json"), JSON.stringify(codes)),
    writeFile(resolve(directory, "referrals.json"), JSON.stringify(referrals)),
    writeFile(resolve(directory, "protected-partners.json"), "UNCHANGED")
  ]);
  return directory;
}

test("DRY_RUN reports full UUIDs and selects only the exact referrer site without writing", async () => {
  const directory = await fixture();
  const before = await readFile(resolve(directory, "referrals.json"), "utf8");
  const result = await cleanupJairoPintoTestReferrals({ storageDirectory: directory });
  assert.equal(result.mode, "DRY_RUN");
  assert.deepEqual(result.referralRelationsCandidates.map((record) => record.id), ids);
  assert.deepEqual(result.referralRelationsDeletable.map((record) => record.id), ids);
  assert.deepEqual(result.referralRelationsBlocked, []);
  assert.equal(result.leadDeletionBlocked, true);
  assert.equal(result.codeReleaseCandidate.releasable, true);
  assert.equal(await readFile(resolve(directory, "referrals.json"), "utf8"), before);
});

test("published referred partners do not block relation-only cleanup planning", () => {
  const referrals = ids.map((id, index) => ({
    id,
    referrerSiteId: "jairo-pinto-test",
    referrerCode: "7417984",
    referredSiteId: ["jenny-varela", "claudia-calero", "blanca-ruiz"][index],
    status: "CANCELLED",
    targetPublicationState: "VERIFIED"
  }));
  const result = planReferralRelationCleanup({ codes: [{ siteId: "jairo-pinto-test", code: "7417984" }], referrals });
  assert.equal(result.referralRelationsDeletable.length, 3);
  assert.equal(result.referralRelationsBlocked.length, 0);
  assert.equal(result.leadDeletionBlocked, true);
});

test("APPLY_REFERRAL_RELATIONS requires its literal confirmation", async () => {
  const directory = await fixture();
  await assert.rejects(cleanupJairoPintoTestReferrals({ storageDirectory: directory, mode: APPLY_MODE }), new RegExp(APPLY_MODE));
});

test("APPLY_REFERRAL_RELATIONS changes only exact relations and releases the test code", async () => {
  const directory = await fixture();
  const result = await cleanupJairoPintoTestReferrals({
    storageDirectory: directory,
    mode: APPLY_MODE,
    confirmation: APPLY_CONFIRMATION,
    now: new Date("2026-08-18T12:00:00.000Z")
  });
  const codes = JSON.parse(await readFile(resolve(directory, "codes.json"), "utf8"));
  const referrals = JSON.parse(await readFile(resolve(directory, "referrals.json"), "utf8"));
  assert.equal(result.changed, true);
  assert.deepEqual(codes, [{ siteId: "real-partner", code: "REAL123", displayName: "Real Partner" }]);
  assert.deepEqual(referrals.map((record) => record.referredSiteId), ["real-referred", "code-only-match"]);
  assert.equal(await readFile(resolve(directory, "protected-partners.json"), "utf8"), "UNCHANGED");
});

test("a repeated relation cleanup is idempotent", async () => {
  const directory = await fixture();
  await cleanupJairoPintoTestReferrals({ storageDirectory: directory, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION });
  const second = await cleanupJairoPintoTestReferrals({ storageDirectory: directory, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION });
  assert.equal(second.changed, false);
  assert.deepEqual(second.referralRelationsCandidates, []);
});

test("an invalid referral UUID blocks relation cleanup", () => {
  const result = planReferralRelationCleanup({
    codes: [{ siteId: "jairo-pinto-test", code: "7417984" }],
    referrals: [{ id: "not-a-uuid", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", referredSiteId: "jenny-varela", status: "CANCELLED" }]
  });
  assert.equal(result.referralRelationsDeletable.length, 0);
  assert.equal(result.referralRelationsBlocked[0].reason, "INVALID_OR_MISSING_REFERRAL_UUID");
});
