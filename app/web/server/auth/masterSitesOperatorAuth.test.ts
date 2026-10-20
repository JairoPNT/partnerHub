import assert from "node:assert/strict";
import test from "node:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

import { createMasterSitesOperatorAuthorizer, MasterSitesOperatorAuthError } from "./masterSitesOperatorAuth.ts";

const source = {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: "https://test-team.cloudflareaccess.com",
  CLOUDFLARE_ACCESS_AUD: "admin-app-audience",
  CLOUDFLARE_ACCESS_PUBLICATION_AUD: "not-the-browser-audience",
  MASTER_SITES_SUPER_ADMIN_EMAILS: " operator@example.test , SECOND@example.test "
};

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({ keys: [{ ...jwk, kid: "operator-test", alg: "RS256" }] });
  async function token(options: { service?: boolean; email?: string; audience?: string; expiry?: number | string } = {}) {
    return new SignJWT(options.service
      ? { type: "app", common_name: "client.access", email: "operator@example.test" }
      : { email: options.email ?? "Operator@Example.Test" })
      .setProtectedHeader({ alg: "RS256", kid: "operator-test" })
      .setIssuer(source.CLOUDFLARE_ACCESS_TEAM_DOMAIN)
      .setAudience(options.audience ?? source.CLOUDFLARE_ACCESS_AUD)
      .setSubject(options.service ? "" : "verified-human")
      .setIssuedAt()
      .setExpirationTime(options.expiry ?? "5m")
      .sign(privateKey);
  }
  return { keyResolver, token };
}

function request(token?: string, options: { method?: string; origin?: string; contentType?: string } = {}) {
  return new Request("https://app.partnerhub.club/api/internal/master-sites/business", {
    method: options.method ?? "GET",
    headers: {
      ...(token ? { "cf-access-jwt-assertion": token } : {}),
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.contentType ? { "Content-Type": options.contentType } : {})
    },
    ...(options.method === "POST" ? { body: JSON.stringify({ role: "admin", email: "operator@example.test" }) } : {})
  });
}

function denied(status: number, code?: string) {
  return (error: unknown) => {
    assert.ok(error instanceof MasterSitesOperatorAuthError);
    assert.equal(error.status, status);
    if (code) assert.equal(error.code, code);
    assert.equal(error.message, error.code);
    assert.equal("cause" in error, false);
    return true;
  };
}

// Removing the human/allowlist gate would dispatch these unauthorized requests.
test("rejects_missing_allowlist_service_identity_and_nonmember_before_dispatch", async () => {
  const f = await fixture();
  const cases = [
    { env: source, token: undefined, status: 401 },
    { env: { ...source, MASTER_SITES_SUPER_ADMIN_EMAILS: "" }, token: await f.token(), status: 403 },
    { env: { ...source, MASTER_SITES_SUPER_ADMIN_EMAILS: " , , " }, token: await f.token(), status: 403 },
    { env: source, token: await f.token({ service: true }), status: 403 },
    { env: source, token: await f.token({ email: "another@example.test" }), status: 403 }
  ];
  let dispatched = 0;
  for (const scenario of cases) {
    const authorize = createMasterSitesOperatorAuthorizer({ source: scenario.env, keyResolver: f.keyResolver });
    await assert.rejects(async () => { await authorize(request(scenario.token)); dispatched += 1; }, denied(scenario.status));
  }
  assert.equal(dispatched, 0);
});

// Trusting body/header claims or skipping signature/audience validation would accept these.
test("rejects_forged_identity_and_cross_origin_post", async () => {
  const f = await fixture();
  const forged = await fixture();
  const authorize = createMasterSitesOperatorAuthorizer({ source, keyResolver: f.keyResolver });
  for (const jwt of [await forged.token(), await f.token({ audience: "wrong-audience" }), await f.token({ expiry: -1 })]) {
    await assert.rejects(authorize(request(jwt, {
      method: "POST", origin: "https://app.partnerhub.club", contentType: "application/json"
    })), denied(401, "ACCESS_TOKEN_INVALID"));
  }
  await assert.rejects(authorize(request(await f.token(), {
    method: "POST", origin: "https://attacker.example.test", contentType: "application/json"
  })), denied(403, "MASTER_SITES_ORIGIN_FORBIDDEN"));
});

test("accepts only signed allowlisted humans with the existing administrative audience", async () => {
  const f = await fixture();
  const authorize = createMasterSitesOperatorAuthorizer({ source, keyResolver: f.keyResolver });
  assert.equal((await authorize(request(await f.token()))).subject, "verified-human");
  assert.equal((await authorize(request(await f.token({ email: "second@example.test" }), {
    method: "POST", origin: "https://app.partnerhub.club", contentType: "application/json; charset=utf-8"
  }))).identityType, "HUMAN");
  await assert.rejects(authorize(request(await f.token({ audience: source.CLOUDFLARE_ACCESS_PUBLICATION_AUD }))), denied(401));
});

test("rejects POST without exact approved origin or JSON before dispatch", async () => {
  const f = await fixture();
  const authorize = createMasterSitesOperatorAuthorizer({ source, keyResolver: f.keyResolver });
  const jwt = await f.token();
  for (const origin of [undefined, "null", "https://app.partnerhub.club.evil.test", "http://app.partnerhub.club", "https://app.partnerhub.club/"]) {
    await assert.rejects(authorize(request(jwt, { method: "POST", origin, contentType: "application/json" })), denied(403));
  }
  for (const contentType of [undefined, "text/plain", "application/jsonp", "application/x-www-form-urlencoded"]) {
    await assert.rejects(authorize(request(jwt, { method: "POST", origin: "https://app.partnerhub.club", contentType })), denied(400, "MASTER_SITES_JSON_REQUIRED"));
  }
});

test("denies missing Access configuration with a safe typed error", async () => {
  const f = await fixture();
  const authorize = createMasterSitesOperatorAuthorizer({ source: { MASTER_SITES_SUPER_ADMIN_EMAILS: "operator@example.test" }, keyResolver: f.keyResolver });
  await assert.rejects(authorize(request(await f.token())), denied(403, "MASTER_SITES_AUTH_CONFIGURATION_INVALID"));
});
