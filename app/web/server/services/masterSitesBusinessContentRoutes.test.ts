import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createMasterSitesOperatorAuthorizer } from '../auth/masterSitesOperatorAuth.ts';
import { createMasterSitesBusinessContentRouteHandlers } from './masterSitesBusinessContentRouteHandlers.ts';
import { createMasterSitesBusinessContentService } from './masterSitesBusinessContentService.ts';
import { contentFixture, anaId, bobId, profile } from './masterSitesBusinessContent.test-fixtures.ts';
import { GET, PUT } from '../../app/api/internal/master-sites/business/content/route.ts';

const authConfig = { NODE_ENV: 'test' as const, CLOUDFLARE_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com', CLOUDFLARE_ACCESS_AUD: 'test-admin-audience', MASTER_SITES_SUPER_ADMIN_EMAILS: 'operator@example.test' };
async function auth() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test', alg: 'RS256' }] });
  const token = (email = 'operator@example.test', service = false) => new SignJWT({ email, ...(service ? { type: 'app', common_name: 'test-client' } : {}) })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject(service ? '' : 'verified-human')
    .setIssuer(authConfig.CLOUDFLARE_ACCESS_TEAM_DOMAIN).setAudience(authConfig.CLOUDFLARE_ACCESS_AUD).setExpirationTime('5m').sign(privateKey);
  return { authorize: createMasterSitesOperatorAuthorizer({ source: authConfig, keyResolver }), token };
}
function request(jwt?: string, body?: unknown, options: { query?: string; method?: string; origin?: string; contentType?: string } = {}) {
  const method = options.method ?? (body === undefined ? 'GET' : 'PUT');
  return new Request(`https://app.partnerhub.club/api/internal/master-sites/business/content?${options.query ?? `activationLeadId=${anaId}`}`, {
    method, headers: { ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}), Origin: options.origin ?? 'https://app.partnerhub.club', 'Content-Type': options.contentType ?? 'application/json' },
    ...(method !== 'GET' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
}
async function response(res: Response, status: number, error?: string) {
  assert.equal(res.status, status); assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json(); if (error) assert.equal(body.error, error);
  assert.doesNotMatch(JSON.stringify(body), /ownerKey|sourceHash|entitlement|onboardingToken|operator@example|private-path|provider-secret/);
  return body;
}

test('real human Super Admin authentication precedes service creation and JSON parsing', async () => {
  const f = await auth(); let creations = 0;
  const handlers = createMasterSitesBusinessContentRouteHandlers({ authorize: f.authorize, service: () => { creations++; throw new Error('private-path'); } });
  await response(await handlers.GET(request()), 401, 'ACCESS_TOKEN_MISSING');
  await response(await handlers.PUT(request(undefined, '{broken')), 401);
  await response(await handlers.PUT(request(await f.token('other@example.test'), '{broken')), 403, 'MASTER_SITES_FORBIDDEN');
  await response(await handlers.PUT(request(await f.token('operator@example.test', true), '{broken')), 403, 'MASTER_SITES_FORBIDDEN');
  assert.equal(creations, 0);
});

test('PUT requires exact same Origin and JSON before parsing or creating services', async () => {
  const f = await auth(); const jwt = await f.token(); let creations = 0;
  const handlers = createMasterSitesBusinessContentRouteHandlers({ authorize: f.authorize, service: () => { creations++; throw new Error('private-path'); } });
  for (const origin of ['https://evil.test', '', 'null']) await response(await handlers.PUT(request(jwt, '{broken', { origin })), 403, 'MASTER_SITES_ORIGIN_FORBIDDEN');
  for (const contentType of ['', 'text/plain', 'application/x-www-form-urlencoded']) await response(await handlers.PUT(request(jwt, '{broken', { contentType })), 400, 'MASTER_SITES_JSON_REQUIRED');
  await response(await handlers.PUT(request(jwt, '{broken')), 400, 'MASTER_SITES_INVALID_REQUEST');
  for (const body of [{ activationLeadId: anaId, expectedRevision: 'a'.repeat(64), profile, siteId: 'bob-business' }, { activationLeadId: anaId, expectedRevision: 'a'.repeat(64), profile: { ...profile, ownerKey: bobId } }, { activationLeadId: anaId, expectedRevision: 'a'.repeat(64), profile: { ...profile, hero: { headline: '<script>x</script>', subheadline: 'x' } } }])
    await response(await handlers.PUT(request(jwt, body)), 400, 'MASTER_SITES_INVALID_REQUEST');
  assert.equal(creations, 0);
});

test('GET rejects missing duplicate malformed and forged query fields before service creation', async () => {
  const f = await auth(); const jwt = await f.token(); let creations = 0;
  const handlers = createMasterSitesBusinessContentRouteHandlers({ authorize: f.authorize, service: () => { creations++; throw new Error('private-path'); } });
  for (const query of ['', 'activationLeadId=bad', `activationLeadId=${anaId}&activationLeadId=${bobId}`, `activationLeadId=${anaId}&siteId=bob-business`])
    await response(await handlers.GET(request(jwt, undefined, { query })), 400, 'MASTER_SITES_INVALID_REQUEST');
  assert.equal(creations, 0);
});

test('GET/PUT isolate selected partner, return safe projection, and never generate or publish', async (t) => {
  const f = await contentFixture(t); const authentication = await auth(); const jwt = await authentication.token();
  const handlers = createMasterSitesBusinessContentRouteHandlers({ authorize: authentication.authorize, service: () => createMasterSitesBusinessContentService(f) });
  const before = await response(await handlers.GET(request(jwt)), 200);
  assert.equal(before.profile, null); assert.deepEqual((await readdir(f.directory)), []);
  await response(await handlers.PUT(request(jwt, { activationLeadId: bobId, expectedRevision: before.revision, profile })), 409, 'MASTER_SITES_REVIEW_CONFLICT');
  const saved = await response(await handlers.PUT(request(jwt, { activationLeadId: anaId, expectedRevision: before.revision, profile })), 200);
  assert.deepEqual(Object.keys(saved).sort(), ['activationLeadId', 'displayName', 'siteId', 'publicHost', 'revision', 'profile'].sort());
  assert.deepEqual(saved.profile, profile); assert.notEqual(saved.revision, before.revision);
  const bytes = await readFile(resolve(f.directory, 'ana-business.json'), 'utf8');
  await response(await handlers.PUT(request(jwt, { activationLeadId: anaId, expectedRevision: before.revision, profile })), 409, 'MASTER_SITES_REVIEW_CONFLICT');
  assert.equal(await readFile(resolve(f.directory, 'ana-business.json'), 'utf8'), bytes);
  assert.equal((await response(await handlers.GET(request(jwt, undefined, { query: `activationLeadId=${bobId}` })), 200)).profile, null);
  assert.deepEqual((await readdir(f.root)).sort(), ['.business-publication-site-claims', '.sources']);
  await response(await handlers.GET(request(jwt, undefined, { query: 'activationLeadId=33333333-3333-4333-8333-333333333333' })), 404, 'MASTER_SITES_PARTNER_NOT_FOUND');
  f.state.eligible = false; await response(await handlers.GET(request(jwt)), 409, 'MASTER_SITES_CONTENT_BLOCKED');
});

test('unexpected errors are sanitized and methods are explicit', async () => {
  const f = await auth(); const jwt = await f.token();
  const handlers = createMasterSitesBusinessContentRouteHandlers({ authorize: f.authorize, service: () => { throw new Error('private-path provider-secret'); } });
  await response(await handlers.GET(request(jwt)), 500, 'MASTER_SITES_INTERNAL_ERROR');
  await response(await handlers.GET(request(jwt, '{}')), 405, 'MASTER_SITES_METHOD_NOT_ALLOWED');
  await response(await handlers.PUT(request(jwt)), 405, 'MASTER_SITES_METHOD_NOT_ALLOWED');
});

test('actual Next exports deny unauthenticated calls without creating runtime services', async (t) => {
  const env = { ...process.env }; t.after(() => { process.env = env; }); Object.assign(process.env, authConfig);
  await response(await GET(request()), 401, 'ACCESS_TOKEN_MISSING');
  await response(await PUT(request(undefined, '{broken')), 401, 'ACCESS_TOKEN_MISSING');
});
