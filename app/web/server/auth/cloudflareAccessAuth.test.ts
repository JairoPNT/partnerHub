import assert from "node:assert/strict";
import test from "node:test";

import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

import {
  authenticateCloudflareAccessRequest,
  CloudflareAccessAuthError
} from "./cloudflareAccessAuth.ts";

const configuration = {
  teamDomain: "https://team.cloudflareaccess.com",
  audience: "expected-audience"
};

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({ keys: [{ ...jwk, kid: "test-key", alg: "RS256" }] });
  async function token(overrides: { audience?: string; expiresIn?: string | number } = {}) {
    return new SignJWT({ email: "admin@example.com" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(configuration.teamDomain)
      .setAudience(overrides.audience ?? configuration.audience)
      .setSubject("access-user-id")
      .setIssuedAt()
      .setExpirationTime(overrides.expiresIn ?? "5m")
      .sign(privateKey);
  }
  return { keyResolver, token };
}

test("accepts a valid Cloudflare Access JWT and returns identity", async () => {
  const { keyResolver, token } = await fixture();
  const request = new Request("https://app.partnerhub.club/api/internal/publishing-targets", {
    headers: { "cf-access-jwt-assertion": await token() }
  });
  const identity = await authenticateCloudflareAccessRequest(request, configuration, keyResolver);
  assert.equal(identity.subject, "access-user-id");
  assert.equal(identity.email, "admin@example.com");
});

test("rejects a request without the Access assertion", async () => {
  await assert.rejects(
    authenticateCloudflareAccessRequest(new Request("https://app.partnerhub.club"), configuration),
    (error) => error instanceof CloudflareAccessAuthError && error.code === "ACCESS_TOKEN_MISSING"
  );
});

test("rejects a token issued for another audience", async () => {
  const { keyResolver, token } = await fixture();
  const request = new Request("https://app.partnerhub.club", {
    headers: { "cf-access-jwt-assertion": await token({ audience: "other-application" }) }
  });
  await assert.rejects(
    authenticateCloudflareAccessRequest(request, configuration, keyResolver),
    (error) => error instanceof CloudflareAccessAuthError && error.code === "ACCESS_TOKEN_INVALID"
  );
});

test("rejects an expired Access token", async () => {
  const { keyResolver, token } = await fixture();
  const request = new Request("https://app.partnerhub.club", {
    headers: { "cf-access-jwt-assertion": await token({ expiresIn: -1 }) }
  });
  await assert.rejects(
    authenticateCloudflareAccessRequest(request, configuration, keyResolver),
    (error) => error instanceof CloudflareAccessAuthError && error.code === "ACCESS_TOKEN_INVALID"
  );
});
