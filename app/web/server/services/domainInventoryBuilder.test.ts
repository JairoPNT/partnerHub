import assert from "node:assert/strict";
import test from "node:test";

import { buildDomainInventory } from "./domainInventoryBuilder.ts";

const lead = {
  id: "f52b9f26-643b-48fb-91c6-e569101b8f77",
  siteId: "lida-castaneda",
  fullName: "Lida Castañeda",
  brandName: "Lida Castañeda",
  ecosystemType: "PRODUCT",
  publicationState: "VERIFIED",
  onboardingData: { domain: "lidacastaneda.pro" }
};

test("returns three canonical masters and one real legacy domain without inventing subdomains", () => {
  const inventory = buildDomainInventory({ leads: [lead], sources: [], targets: [], verifications: [] });
  assert.equal(inventory.filter((item) => item.kind === "MASTER").length, 3);
  assert.equal(inventory.filter((item) => item.kind === "PARTNER_LEGACY").length, 1);
  assert.equal(inventory.some((item) => item.hostname === "producto.lidacastaneda.pro"), false);
});

test("keeps provisioning, DNS, SSL, publication, and verification as separate states", () => {
  const inventory = buildDomainInventory({
    leads: [lead],
    sources: [],
    targets: [{
      ownerKey: lead.id,
      siteId: "lida-producto",
      ecosystemType: "PRODUCT",
      publicHost: "producto.lidacastaneda.pro",
      provisioningState: "SSL_PENDING",
      hostingerState: "READY",
      dnsState: "RESOLVED",
      sslState: "PENDING",
      updatedAt: "2026-08-07T12:00:00.000Z"
    }],
    verifications: [{ siteId: "lida-producto", status: "VERIFY_FAILED", verifiedAt: "2026-08-07T12:01:00.000Z" }]
  });
  const target = inventory.find((item) => item.siteId === "lida-producto");
  assert.equal(target?.provisioningState, "SSL_PENDING");
  assert.equal(target?.dnsState, "RESOLVED");
  assert.equal(target?.sslState, "PENDING");
  assert.equal(target?.publicationState, "NOT_TRACKED");
  assert.equal(target?.verificationState, "VERIFY_FAILED");
});

test("does not expose target infrastructure fields and preserves an orphan target", () => {
  const inventory = buildDomainInventory({
    leads: [],
    sources: [],
    targets: [{
      ownerKey: lead.id,
      siteId: "orphan-business",
      ecosystemType: "BUSINESS",
      publicHost: "negocio.example.pro",
      provisioningState: "READY",
      hostingerState: "READY",
      dnsState: "RESOLVED",
      sslState: "READY",
      lastErrorCode: "SAFE_CODE",
      updatedAt: "2026-08-07T12:00:00.000Z"
    }],
    verifications: []
  });
  const target = inventory.find((item) => item.siteId === "orphan-business")!;
  assert.equal(target.partner, null);
  assert.equal("ownerKey" in target, false);
  assert.equal("remoteRoot" in target, false);
  assert.equal(target.lastErrorCode, "SAFE_CODE");
});
