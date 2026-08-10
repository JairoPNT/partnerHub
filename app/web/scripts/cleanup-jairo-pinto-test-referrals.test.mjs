import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { cleanupJairoPintoTestReferrals } from "./cleanup-jairo-pinto-test-referrals.mjs";

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-referral-cleanup-"));
  await writeFile(
    resolve(directory, "codes.json"),
    JSON.stringify([
      { siteId: "jairo-pinto-test", code: "7417984", displayName: "Jairo Test" },
      { siteId: "real-partner", code: "REAL123", displayName: "Real Partner" }
    ])
  );
  await writeFile(
    resolve(directory, "referrals.json"),
    JSON.stringify([
      { id: "1", referredSiteId: "jenny-varela", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "QUALIFIED" },
      { id: "2", referredSiteId: "claudia-calero", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "CANCELLED" },
      { id: "3", referredSiteId: "blanca-ruiz", referrerSiteId: "jairo-pinto-test", referrerCode: "7417984", status: "CANCELLED" },
      { id: "4", referredSiteId: "real-referred", referrerSiteId: "real-partner", referrerCode: "REAL123", status: "QUALIFIED" }
    ])
  );
  return directory;
}

test("dry run identifies only test referral relationships without writing", async () => {
  const directory = await fixture();
  const before = await readFile(resolve(directory, "referrals.json"), "utf8");
  const result = await cleanupJairoPintoTestReferrals({ storageDirectory: directory });

  assert.equal(result.mode, "DRY_RUN");
  assert.equal(result.removedCodeCount, 1);
  assert.equal(result.removedReferralCount, 3);
  assert.deepEqual(result.removedReferrals, [
    { referredSiteId: "jenny-varela", status: "QUALIFIED" },
    { referredSiteId: "claudia-calero", status: "CANCELLED" },
    { referredSiteId: "blanca-ruiz", status: "CANCELLED" }
  ]);
  assert.equal(await readFile(resolve(directory, "referrals.json"), "utf8"), before);
});

test("apply backs up sources and preserves unrelated records", async () => {
  const directory = await fixture();
  const result = await cleanupJairoPintoTestReferrals({
    storageDirectory: directory,
    apply: true,
    now: new Date("2026-08-10T12:00:00.000Z")
  });
  const codes = JSON.parse(await readFile(resolve(directory, "codes.json"), "utf8"));
  const referrals = JSON.parse(await readFile(resolve(directory, "referrals.json"), "utf8"));
  const backupReferrals = JSON.parse(
    await readFile(resolve(result.backupDirectory, "referrals.json"), "utf8")
  );

  assert.deepEqual(codes.map((record) => record.siteId), ["real-partner"]);
  assert.deepEqual(referrals.map((record) => record.referredSiteId), ["real-referred"]);
  assert.equal(backupReferrals.length, 4);
});
