import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { prepareJairoBusinessProvisioningPreview } from "./prepare-jairo-business-provisioning-preview.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const source = json({ site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" }, ecosystemType: "BUSINESS" });
const entitlement = json({ activationLeadId: "f403f29e-95c8-4825-9320-967376443020", commercialState: "KNOWN", includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
  expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }], rootRedirectApex: { preserved: true, isPublishingTarget: false } });

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "business-preview-inputs-"));
  const sources = resolve(root, "sources"); const inputParent = resolve(root, "inputs"); const state = resolve(root, "state");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true }); await mkdir(inputParent);
  const sourcePath = resolve(sources, "jairo-pinto-business.json"); const entitlementPath = resolve(root, "approved-entitlement.json");
  await writeFile(sourcePath, source); await writeFile(entitlementPath, entitlement);
  return { root, sources, inputParent, state, sourcePath, entitlementPath };
}

const expectedSource = "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725";
const expectedEntitlement = "da41622c14c8f6377285b4625c498012532554bfb8b079dc6edf05ad58b20399";
const contract = { activationLeadId: "f403f29e-95c8-4825-9320-967376443020", ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
  rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", sourceHash: createHash("sha256").update(source).digest("hex"), entitlementHash: createHash("sha256").update(entitlement).digest("hex") };

test("prepares exact inputs and executes PREVIEW without provider calls", async () => {
  const fx = await fixture();
  assert.notEqual(contract.sourceHash, expectedSource); assert.notEqual(contract.entitlementHash, expectedEntitlement);
  const result = await prepareJairoBusinessProvisioningPreview({ sourceDirectory: fx.sources, approvedEntitlementPath: fx.entitlementPath, inputParent: fx.inputParent, stateDirectory: fx.state, environment: {}, contract });
  assert.equal(result.preview.blocked, false); assert.equal(result.preview.changed, false); assert.equal(result.providerCallsMade, false);
  assert.equal(JSON.parse(await readFile(resolve(result.inputs.directory, "entitlement.json"))).activationLeadId, "f403f29e-95c8-4825-9320-967376443020");
});

test("accepts only an empty existing staging directory", async () => {
  const fx = await fixture(); const staging = resolve(fx.inputParent, ".CDX-20260824-007.staging"); await mkdir(staging);
  await writeFile(resolve(staging, "foreign"), "x");
  await assert.rejects(() => prepareJairoBusinessProvisioningPreview({ sourceDirectory: fx.sources, approvedEntitlementPath: fx.entitlementPath, inputParent: fx.inputParent, stateDirectory: fx.state, contract }), /PROVISIONING_STAGING_NOT_EMPTY/);
});

test("blocks final input, state, target, source drift and entitlement drift", async () => {
  const fx = await fixture(); await mkdir(resolve(fx.inputParent, "CDX-20260824-007"));
  await assert.rejects(() => prepareJairoBusinessProvisioningPreview({ sourceDirectory: fx.sources, approvedEntitlementPath: fx.entitlementPath, inputParent: fx.inputParent, stateDirectory: fx.state, contract }), /PROVISIONING_INPUT_ALREADY_EXISTS/);
  const fx2 = await fixture(); await writeFile(fx2.sourcePath, `${source} `);
  await assert.rejects(() => prepareJairoBusinessProvisioningPreview({ sourceDirectory: fx2.sources, approvedEntitlementPath: fx2.entitlementPath, inputParent: fx2.inputParent, stateDirectory: fx2.state, contract }), /SOURCE_HASH_DRIFT/);
  const fx3 = await fixture(); await writeFile(fx3.entitlementPath, `${entitlement} `);
  await assert.rejects(() => prepareJairoBusinessProvisioningPreview({ sourceDirectory: fx3.sources, approvedEntitlementPath: fx3.entitlementPath, inputParent: fx3.inputParent, stateDirectory: fx3.state, contract }), /APPROVED_ENTITLEMENT_HASH_DRIFT/);
});
