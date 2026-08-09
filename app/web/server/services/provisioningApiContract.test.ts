import assert from "node:assert/strict";
import test from "node:test";

import {
  safeProvisioningError,
  toSafePublishingTarget,
  withServerProvisioningIpv4
} from "./provisioningApiContract.ts";

const internalTarget = {
  siteId: "lida-producto",
  ownerKey: "f52b9f26-643b-48fb-91c6-e569101b8f77",
  ecosystemType: "PRODUCT",
  baseDomain: "lidacastaneda.pro",
  publicHost: "producto.lidacastaneda.pro",
  remoteRoot: "/home/u123/domains/producto.lidacastaneda.pro/public_html",
  provisioningState: "READY",
  hostingerState: "READY",
  dnsState: "RESOLVED",
  sslState: "READY",
  dnsRecordId: "secret-provider-id",
  createdAt: "2026-08-07T12:00:00.000Z",
  updatedAt: "2026-08-07T12:05:00.000Z"
};

test("safe target response excludes ownership, remote path, and provider record id", () => {
  const safe = toSafePublishingTarget(internalTarget);
  assert.equal("ownerKey" in safe, false);
  assert.equal("remoteRoot" in safe, false);
  assert.equal("dnsRecordId" in safe, false);
  assert.equal(safe.publicHost, "producto.lidacastaneda.pro");
});

test("maps known errors to stable statuses without provider messages", () => {
  assert.deepEqual(safeProvisioningError({ code: "PROVISIONING_TARGET_CONFLICT", message: "private" }), {
    status: 409,
    code: "PROVISIONING_TARGET_CONFLICT"
  });
  assert.deepEqual(safeProvisioningError(new Error("provider secret")), {
    status: 500,
    code: "PROVISIONING_REQUEST_FAILED"
  });
});

test("server IPv4 overrides any request-supplied infrastructure address", () => {
  assert.deepEqual(withServerProvisioningIpv4({ siteId: "lida-producto", ipv4: "203.0.113.9" }, "82.29.157.103"), {
    siteId: "lida-producto",
    ipv4: "82.29.157.103"
  });
});
