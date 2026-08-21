import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeInventory, planPartnerIdentity } from "./all-partner-source-identity-dry-run.mjs";

const leadId = "22f9392f-69c2-4b80-861c-baa3cb10c5c1";
const inventory = [
  { siteId: "blanca-ruiz", domain: "blancastella.pro", ecosystemType: null, verificationState: "VERIFIED" },
  { siteId: "claudia-calero", domain: "claudiacalero.pro", ecosystemType: "PRODUCT", verificationState: "VERIFIED" },
  { siteId: "dorian-higuita", domain: "dorianhiguita.pro", ecosystemType: null, verificationState: "VERIFIED" },
  { siteId: "jairo-pinto", domain: "jairopinto.pro", ecosystemType: "PRODUCT", verificationState: "VERIFIED" },
  { siteId: "lida-castaneda", domain: "lidacastaneda.pro", ecosystemType: "PRODUCT", verificationState: "VERIFIED" },
  { siteId: "yenny-garcia", domain: "yennygarcia.pro", ecosystemType: "PRODUCT", verificationState: "VERIFIED" }
];
const entitlements = [{ siteId: "claudia-calero", activationLeadId: leadId, includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] }];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const manifest = { confirmation: "DRY_RUN_ONE_PARTNER_SOURCE_IDENTITY", expectedInventoryHash: hash(normalizeInventory(inventory)), expectedEntitlementsHash: hash(`${JSON.stringify(entitlements, null, 2)}\n`), allowlist: [{ activationLeadId: leadId, siteId: "claudia-calero" }] };

test("projects one allowlisted partner and preserves apex with Brand redirect", () => {
  const plan = planPartnerIdentity({ inventory, entitlements, existingSources: [], existingTargets: [], manifest });
  assert.equal(plan.changed, false); assert.equal(plan.blocked, false);
  assert.deepEqual(plan.projections.map((item) => item.siteId), ["claudia-calero-product", "claudia-calero-business", "claudia-calero"]);
  assert.equal(plan.apex.redirectTarget, "brand.claudiacalero.pro"); assert.equal(plan.apex.preserved, true);
  assert.equal(plan.recommendedOrder[0].siteId, "claudia-calero");
});

test("one ecosystem redirects apex to that ecosystem", () => {
  const single = [{ siteId: "claudia-calero", activationLeadId: leadId, includedEcosystems: ["PRODUCT"] }];
  const singleManifest = { ...manifest, expectedEntitlementsHash: hash(`${JSON.stringify(single, null, 2)}\n`) };
  const plan = planPartnerIdentity({ inventory, entitlements: single, existingSources: [], existingTargets: [], manifest: singleManifest });
  assert.equal(plan.apex.redirectTarget, "producto.claudiacalero.pro");
});

test("blocks null ecosystem, multi ecosystem without Brand, and collisions", () => {
  const nullEntitlement = [{ siteId: "blanca-ruiz", activationLeadId: leadId, includedEcosystems: ["PRODUCT", "BUSINESS"] }];
  const nullManifest = { ...manifest, expectedEntitlementsHash: hash(`${JSON.stringify(nullEntitlement, null, 2)}\n`), allowlist: [{ activationLeadId: leadId, siteId: "blanca-ruiz" }] };
  const plan = planPartnerIdentity({ inventory, entitlements: nullEntitlement, existingSources: [{ siteId: "blanca-ruiz-product", ecosystemType: "BUSINESS" }], existingTargets: [], manifest: nullManifest });
  assert.ok(plan.blockedReasons.includes("ECOSYSTEM_TYPE_NULL"));
  assert.ok(plan.blockedReasons.includes("MULTI_ECOSYSTEM_BRAND_REDIRECT_UNENTITLED"));
  assert.ok(plan.blockedReasons.includes("SOURCE_COLLISION:blanca-ruiz-product"));
});

test("requires exactly one allowlisted partner and reviewed hashes", () => {
  assert.throws(() => planPartnerIdentity({ inventory, entitlements, existingSources: [], existingTargets: [], manifest: { ...manifest, allowlist: [] } }), /exactly one/);
  assert.throws(() => planPartnerIdentity({ inventory, entitlements, existingSources: [], existingTargets: [], manifest: { ...manifest, expectedInventoryHash: "0".repeat(64) } }), /INVENTORY_HASH_MISMATCH/);
});
