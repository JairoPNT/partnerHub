import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { diagnose } from "./jairo-business-provisioning-recovery-diagnostic.mjs";

test("reports retained partial target and redacted owned claim without writes", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "cdx003-")); const state = resolve(root, "state"); const claim = resolve(state, "claim"); const targetPath = resolve(root, "target.json"); await mkdir(claim, { recursive: true });
  await writeFile(targetPath, JSON.stringify({ version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", provisioningState: "FAILED", publicationState: "PENDING", hostingerState: "READY", dnsState: "FAILED", sslState: "PENDING", remoteRoot: "/domains/negocio.jairopinto.pro/public_html" }));
  await writeFile(resolve(claim, "owner.json"), JSON.stringify({ token: "must-not-leak", planHash: "7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf", acquiredAt: "2026-08-25T00:00:00.000Z" }));
  const result = await diagnose({ targetPath, stateDirectory: state }); assert.equal(result.changed, false); assert.equal(result.recoveryEligible, true); assert.equal(result.target.dnsState, "FAILED"); assert.equal(result.claim.ownerTokenRedacted, true); assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});
