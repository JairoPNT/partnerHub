import assert from "node:assert/strict";
import test from "node:test";

import {
  PublicationTargetError,
  resolvePublicationTarget,
  resolveVerificationHost
} from "./publicationTargetResolver.ts";
import type { PublicationTargetSnapshot } from "./publicationTargetResolver.ts";

const readyTarget: PublicationTargetSnapshot = {
  siteId: "lida-producto",
  publicHost: "producto.lidacastaneda.pro",
  remoteRoot: "/home/u123/domains/producto.lidacastaneda.pro/public_html",
  provisioningState: "READY"
};

test("preserves the legacy root when no publishing target exists", () => {
  assert.deepEqual(resolvePublicationTarget("/legacy/public_html", null), {
    mode: "LEGACY",
    remoteRoot: "/legacy/public_html",
    publicHost: null
  });
});

test("uses the isolated remote root and public host for a READY target", () => {
  assert.deepEqual(resolvePublicationTarget("/legacy/public_html", readyTarget), {
    mode: "PROVISIONED",
    remoteRoot: "/home/u123/domains/producto.lidacastaneda.pro/public_html",
    publicHost: "producto.lidacastaneda.pro"
  });
});

test("accepts a canonical subdomain even when it is the semantic root redirect ecosystem", () => {
  assert.deepEqual(resolvePublicationTarget("/legacy/public_html", {
    ...readyTarget,
    ecosystemType: "PRODUCT",
    rootEcosystemType: "PRODUCT"
  }), {
    mode: "PROVISIONED",
    remoteRoot: "/home/u123/domains/producto.lidacastaneda.pro/public_html",
    publicHost: "producto.lidacastaneda.pro"
  });
});

test("blocks publication when an explicit target is not READY", () => {
  assert.throws(
    () => resolvePublicationTarget("/legacy/public_html", { ...readyTarget, provisioningState: "SSL_PENDING" }),
    (error) => error instanceof PublicationTargetError && error.code === "PUBLICATION_TARGET_NOT_READY"
  );
});

test("rejects a READY target without a usable remote root", () => {
  assert.throws(
    () => resolvePublicationTarget("/legacy/public_html", { ...readyTarget, remoteRoot: null }),
    (error) => error instanceof PublicationTargetError && error.code === "PUBLICATION_TARGET_INVALID"
  );
});

test("verification prefers the explicit public host without provisioning", () => {
  assert.equal(
    resolveVerificationHost("lidacastaneda.pro", { ...readyTarget, provisioningState: "SSL_PENDING" }),
    "producto.lidacastaneda.pro"
  );
  assert.equal(resolveVerificationHost("lidacastaneda.pro", null), "lidacastaneda.pro");
});
