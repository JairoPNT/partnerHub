import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createMasterSitesOperatorAuthorizer } from '../auth/masterSitesOperatorAuth.ts';
import { createMasterSitesBusinessRouteHandlers } from './masterSitesBusinessRouteHandlers.ts';
import { createMasterSitesBusinessPreviewService } from './masterSitesBusinessPreviewService.ts';
import { createMasterSitesBusinessCommandService } from './masterSitesBusinessCommandService.ts';
import { createPublicationJobService } from './publicationJobService.ts';
import { createSubdomainProvisioningService } from './subdomainProvisioningService.ts';
import { withoutBusinessPublicationSiteOwnership } from './businessPublicationSiteCoordinator.ts';
import { masterSitesBusinessReadResponseSchema, masterSitesBusinessCommandResultSchema } from '../../shared/master-sites-business-contract.ts';
import { GET as defaultGET } from '../../app/api/internal/master-sites/business/route.ts';
import { POST as defaultPrepare } from '../../app/api/internal/master-sites/business/prepare-target/route.ts';
import { POST as defaultPublish } from '../../app/api/internal/master-sites/business/publish/route.ts';

const id = '11111111-1111-4111-8111-111111111111';
const authConfig = {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
  CLOUDFLARE_ACCESS_AUD: 'test-admin-audience', MASTER_SITES_SUPER_ADMIN_EMAILS: 'operator@example.test'
};
async function auth() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test', alg: 'RS256' }] });
  const token = (email = 'operator@example.test', service = false) => new SignJWT({
    email, ...(service ? { type: 'app', common_name: 'test-client' } : {})
  }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject(service ? '' : 'verified-test-human')
    .setIssuer(authConfig.CLOUDFLARE_ACCESS_TEAM_DOMAIN).setAudience(authConfig.CLOUDFLARE_ACCESS_AUD)
    .setExpirationTime('5m').sign(privateKey);
  return { authorize: createMasterSitesOperatorAuthorizer({ source: authConfig, keyResolver }), token, keyResolver };
}
function request(jwt?: string, body?: unknown, options: { method?: string; origin?: string } = {}) {
  const method = options.method ?? (body === undefined ? 'GET' : 'POST');
  return new Request('https://app.partnerhub.club/api/internal/master-sites/business', {
    method, headers: { ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
      Origin: options.origin ?? 'https://app.partnerhub.club', 'Content-Type': 'application/json' },
    ...(method !== 'GET' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
}
async function expectResponse(response: Response, status: number, code?: string) {
  assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  if (code) assert.equal(body.error, code);
  for (const secret of ['payload', 'lease', 'ownerKey', 'actorHash', 'sourceHash', 'remoteRoot', 'private-path'])
    assert.equal(JSON.stringify(body).includes(secret), false);
  return body;
}

test('real_auth_runs_before_dependencies_or_business_body_parsing', async () => {
  const f = await auth();
  let dispatches = 0;
  const services = () => { dispatches++; throw new Error('private-path must not be invoked'); };
  const handlers = createMasterSitesBusinessRouteHandlers({ authorize: f.authorize, services });
  await expectResponse(await handlers.GET(request()), 401, 'ACCESS_TOKEN_MISSING');
  await expectResponse(await handlers.publish(request(undefined, '{broken')), 401, 'ACCESS_TOKEN_MISSING');
  await expectResponse(await handlers.publish(request(await f.token('other@example.test'), '{broken')), 403);
  await expectResponse(await handlers.publish(request(await f.token('operator@example.test', true), '{broken')), 403);
  await expectResponse(await handlers.publish(request(await f.token(), '{}', { origin: 'https://evil.example.test' })), 403);
  const denied = createMasterSitesBusinessRouteHandlers({
    authorize: createMasterSitesOperatorAuthorizer({ source: { ...authConfig, MASTER_SITES_SUPER_ADMIN_EMAILS: '' }, keyResolver: f.keyResolver }), services
  });
  await expectResponse(await denied.GET(request(await f.token())), 403);
  assert.equal(dispatches, 0);
  await expectResponse(await handlers.publish(request(await f.token(), '{broken')), 400, 'MASTER_SITES_INVALID_REQUEST');
  await expectResponse(await handlers.publish(request(await f.token(), { activationLeadId: [id] })), 400);
  assert.equal(dispatches, 0);
});

async function data(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-010-routes-'));
  const environment = { ...process.env };
  t.after(async () => { process.env = environment; await rm(root, { recursive: true, force: true }); });
  Object.assign(process.env, {
    PRODUCT_PAGE_OUTPUT_DIR: root, PRODUCT_PAGE_SOURCE_DIR: resolve(root, '.sources'),
    PRODUCT_PAGE_ACTIVATION_DIR: resolve(root, '.activation'), PRODUCT_PAGE_PAYMENT_DIR: resolve(root, '.payments'),
    PRODUCT_PAGE_COMMERCIAL_GRANT_DIR: resolve(root, '.grants'), PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR: resolve(root, '.journals'),
    PRODUCT_PAGE_TEMPLATE_DIR: resolve('../../plantillas-de-pagina/producto'), PARTNERHUB_PROVISIONING_IPV4: '192.0.2.10'
  });
  const sourceDirectory = process.env.PRODUCT_PAGE_SOURCE_DIR!;
  await mkdir(process.env.PRODUCT_PAGE_ACTIVATION_DIR!, { recursive: true });
  await writeFile(resolve(process.env.PRODUCT_PAGE_ACTIVATION_DIR!, 'leads.json'), JSON.stringify([{
    id, siteId: 'test-partner', status: 'PAID', recordState: 'ACTIVE', fullName: 'Test Partner',
    brandName: 'Test Brand', whatsapp: '573101234567', onboardingData: { domain: 'partner.example.test', whatsapp: '573101234567' },
    offerSnapshot: { offerCode: 'BUSINESS_ONLY', ecosystemTypes: ['BUSINESS'], ecosystemType: 'BUSINESS',
      amountCop: 180000, currency: 'COP', billingType: 'ONE_TIME', catalogVersion: '2026-08-12.v1', selectedAt: '2026-10-20T12:00:00.000Z' }
  }]));
  await cp(resolve('../../plantillas-de-pagina/business'), resolve(root, 'ganomaster-business'), { recursive: true });
  await mkdir(resolve(root, 'ganomaster-business/tipografia'), { recursive: true });
  const jobs = createPublicationJobService({ outputDirectory: root, sourceDirectory, jobDirectory: resolve(root, '.jobs') });
  const preview = createMasterSitesBusinessPreviewService({ listJobs: () => jobs.list() });
  const state = { dnsReady: false, providers: 0 };
  const provisioner = createSubdomainProvisioningService({
    storageDirectory: resolve(sourceDirectory, '.publishing-targets'),
    hostingerClient: { async ensure() {
      state.providers++;
      return { state: 'CREATED', subdomain: { username: 'u12345', parent_domain: 'partner.example.test', subdomain: 'negocio',
        domain: 'negocio.partner.example.test', root_directory: '/domains/partner.example.test/public_html/negocio' } };
    } },
    dnsClient: { async ensureARecord() {
      return { state: 'CREATED', routingMode: 'DIRECT_A', record: { id: 'test-dns', type: 'A', name: 'negocio.partner.example.test', content: '192.0.2.10', ttl: 300 } };
    } },
    readinessProbe: { dnsResolves: async () => state.dnsReady, httpsReady: async () => true }
  });
  const commands = createMasterSitesBusinessCommandService({
    outputDirectory: root, sourceDirectory, jobs, preview, provision: provisioner.provision, wake: async () => undefined
  });
  const authentication = await auth();
  const handlers = createMasterSitesBusinessRouteHandlers({ authorize: authentication.authorize, services: () => ({ preview, commands }) });
  const jwt = await authentication.token();
  const command = async (action: 'prepare' | 'publish') => ({
    requestId: randomUUID(), activationLeadId: id, templateId: 'ganomaster-business',
    expectedRevision: (await preview.getPartner(id)).reviewRevision,
    confirmation: action === 'prepare' ? 'PREPARE_SELECTED_BUSINESS_TARGET' : 'PUBLISH_SELECTED_BUSINESS_TEMPLATE'
  });
  return { root, sourceDirectory, jobs, preview, commands, handlers, jwt, command, state };
}

test('real_handlers_read_without_effects_and_map_404_409_202_200', async (t) => {
  const f = await data(t);
  const before = (await readdir(f.root)).sort();
  const overview = await expectResponse(await f.handlers.GET(request(f.jwt)), 200);
  masterSitesBusinessReadResponseSchema.parse(overview);
  assert.equal(overview.partners[0].status, 'TARGET_REQUIRED');
  assert.deepEqual((await readdir(f.root)).sort(), before);
  assert.equal(f.state.providers, 0);
  const original = await f.command('prepare');
  await expectResponse(await f.handlers.prepareTarget(request(f.jwt, { ...original, activationLeadId: randomUUID() })), 404, 'MASTER_SITES_PARTNER_NOT_FOUND');
  await expectResponse(await f.handlers.prepareTarget(request(f.jwt, { ...original, expectedRevision: 'a'.repeat(64) })), 409, 'MASTER_SITES_REVIEW_CONFLICT');
  const pending = await expectResponse(await f.handlers.prepareTarget(request(f.jwt, original)), 202);
  assert.equal(pending.outcome, 'TARGET_PENDING');
  f.state.dnsReady = true;
  const ready = await expectResponse(await f.handlers.prepareTarget(request(f.jwt, await f.command('prepare'))), 200);
  assert.equal(ready.outcome, 'TARGET_READY');
  const publish = await f.command('publish');
  await f.jobs.withBusinessPublicationSite('test-partner-business', () =>
    withoutBusinessPublicationSiteOwnership(async () =>
      expectResponse(await f.handlers.publish(request(f.jwt, publish)), 409, 'BUSINESS_SITE_BUSY')));
  await expectResponse(await f.handlers.publish(request(f.jwt, { ...publish, ipv4: '192.0.2.99' })), 400);
  const enqueued = await expectResponse(await f.handlers.publish(request(f.jwt, publish)), 202);
  masterSitesBusinessCommandResultSchema.parse(enqueued);
  assert.equal(enqueued.outcome, 'ENQUEUED');
  const replay = await expectResponse(await f.handlers.publish(request(f.jwt, publish)), 200);
  assert.equal(replay.job.id, enqueued.job.id);
  const source = JSON.parse(await readFile(resolve(f.sourceDirectory, 'test-partner-business.json'), 'utf8'));
  assert.equal(source.ecosystemType, 'BUSINESS');
  assert.equal(source.distributor.purchaseUrl, undefined);
  assert.equal((await f.jobs.list()).length, 1);
  const claim = await f.jobs.claimNext('test-route-worker');
  assert.ok(claim);
  await f.jobs.fail(claim.job.id, claim.leaseToken, 'TEST_PUBLICATION_FAILED');
  const failed = await expectResponse(await f.handlers.publish(request(f.jwt, publish)), 409);
  assert.equal(failed.outcome, 'RETRY_REQUIRED');
});

test('http_errors_are_safe_and_methods_are_explicit', async () => {
  const f = await auth();
  const handlers = createMasterSitesBusinessRouteHandlers({ authorize: f.authorize, services: () => { throw new Error('private-path secret provider exception'); } });
  const jwt = await f.token();
  await expectResponse(await handlers.GET(request(jwt)), 500, 'MASTER_SITES_INTERNAL_ERROR');
  await expectResponse(await handlers.GET(request(jwt, '{}')), 405, 'MASTER_SITES_METHOD_NOT_ALLOWED');
  await expectResponse(await handlers.publish(request(jwt)), 405, 'MASTER_SITES_METHOD_NOT_ALLOWED');
});

test('actual_Next_route_exports_deny_without_session_and_without_dependencies', async (t) => {
  const environment = { ...process.env };
  t.after(() => { process.env = environment; });
  Object.assign(process.env, authConfig);
  await expectResponse(await defaultGET(request()), 401, 'ACCESS_TOKEN_MISSING');
  await expectResponse(await defaultPrepare(request(undefined, '{broken')), 401, 'ACCESS_TOKEN_MISSING');
  await expectResponse(await defaultPublish(request(undefined, '{broken')), 401, 'ACCESS_TOKEN_MISSING');
});
