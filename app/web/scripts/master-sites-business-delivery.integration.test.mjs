import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { fetchBusinessRead, sendBusinessCommand, BusinessDeliveryHttpError } from '../components/master-sites-business-delivery-api.ts';
import { buildBusinessCommands, createBusinessDeliveryState, reduceBusinessDeliveryState } from '../components/master-sites-business-delivery-model.ts';
import { createMasterSitesOperatorAuthorizer } from '../server/auth/masterSitesOperatorAuth.ts';
import { createMasterSitesBusinessRouteHandlers } from '../server/services/masterSitesBusinessRouteHandlers.ts';
import { createMasterSitesBusinessCommandService } from '../server/services/masterSitesBusinessCommandService.ts';
import { createBusinessFixtureWorker, createMasterSitesBusinessCommandFixture } from '../server/services/masterSitesBusinessCommand.test-fixtures.ts';
import { productPageGenerationService } from '../server/services/productPageGenerationService.ts';

const origin = 'https://app.partnerhub.club';
const root = '/api/internal/master-sites/business';
const config = {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: 'https://test-team.cloudflareaccess.com',
  CLOUDFLARE_ACCESS_AUD: 'test-admin-audience',
  MASTER_SITES_SUPER_ADMIN_EMAILS: 'operator@example.test'
};

async function identity() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keyResolver = createLocalJWKSet({ keys: [{ ...jwk, kid: 'integration', alg: 'RS256' }] });
  async function token({ email = 'operator@example.test', service = false } = {}) {
    return new SignJWT({ email, ...(service ? { type: 'app', common_name: 'integration-client' } : {}) })
      .setProtectedHeader({ alg: 'RS256', kid: 'integration' })
      .setSubject(service ? '' : 'verified-integration-human')
      .setIssuer(config.CLOUDFLARE_ACCESS_TEAM_DOMAIN).setAudience(config.CLOUDFLARE_ACCESS_AUD)
      .setExpirationTime('5m').sign(privateKey);
  }
  return { token, keyResolver, authorize: createMasterSitesOperatorAuthorizer({ source: config, keyResolver }) };
}

function inMemoryFetcher(handlers, jwt, calls) {
  return async (path, options = {}) => {
    assert.equal(typeof path, 'string');
    assert.ok([root, `${root}/prepare-target`, `${root}/publish`].includes(path), path);
    const method = options.method ?? 'GET';
    assert.equal(method, path === root ? 'GET' : 'POST');
    const headers = new Headers(options.headers);
    if (method === 'GET') {
      assert.equal(options.cache, 'no-store');
      assert.equal(options.body, undefined);
    } else {
      assert.equal(headers.get('content-type'), 'application/json');
      const body = JSON.parse(options.body);
      assert.deepEqual(Object.keys(body).sort(), (path.endsWith('/publish')
        ? ['requestId', 'activationLeadId', 'templateId', 'expectedRevision', 'confirmation', 'updateExisting']
        : ['requestId', 'activationLeadId', 'templateId', 'expectedRevision', 'confirmation']).sort());
      assert.equal(body.templateId, 'ganomaster-business');
      assert.equal(body.confirmation, path.endsWith('/publish') ? 'PUBLISH_SELECTED_BUSINESS_TEMPLATE' : 'PREPARE_SELECTED_BUSINESS_TARGET');
      assert.equal(body.updateExisting, path.endsWith('/publish') ? false : undefined);
    }
    calls.push({ path, method, body: method === 'POST' ? JSON.parse(options.body) : null });
    const request = new Request(`${origin}${path}`, {
      method, headers: {
        ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
        Origin: origin, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      ...(method === 'POST' ? { body: options.body } : {})
    });
    return path === root ? handlers.GET(request)
      : path.endsWith('/prepare-target') ? handlers.prepareTarget(request) : handlers.publish(request);
  };
}

function selected(state, id, action) {
  state = reduceBusinessDeliveryState(state, { type: 'toggle', id });
  state = reduceBusinessDeliveryState(state, { type: 'review', action });
  const commands = buildBusinessCommands(state, action, randomUUID);
  assert.equal(commands.length, 1);
  return { state, command: commands[0] };
}

test('Business-only client read, explicit target, publish, durable worker, and fresh CURRENT', async (t) => {
  const f = await createMasterSitesBusinessCommandFixture(t, false);
  const auth = await identity();
  const calls = [];
  let generations = 0;
  const commands = createMasterSitesBusinessCommandService({ ...f.dependencies,
    async generate(...args) { generations++; return productPageGenerationService.generate(...args); }
  });
  const handlers = createMasterSitesBusinessRouteHandlers({ authorize: auth.authorize, services: () => ({ preview: f.preview, commands }) });
  const fetcher = inMemoryFetcher(handlers, await auth.token(), calls);
  const productBytes = await readFile(f.productPath, 'utf8');
  const apexBytes = await readFile(f.rootPath, 'utf8');
  const beforeRoot = (await readdir(f.root)).sort();
  const beforeSources = (await readdir(f.sourceDirectory)).sort();
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: 'read', data: await fetchBusinessRead(fetcher) });
  assert.equal(state.data.partners.length, 1);
  assert.equal(state.data.partners[0].status, 'TARGET_REQUIRED');
  assert.deepEqual(state.selectedIds, []);
  assert.equal(buildBusinessCommands(state, 'prepare', randomUUID).length, 0);
  assert.deepEqual((await readdir(f.root)).sort(), beforeRoot);
  assert.deepEqual((await readdir(f.sourceDirectory)).sort(), beforeSources);
  assert.deepEqual(f.effects, { hosting: 0, dns: 0, wakes: 0 });
  assert.equal(generations, 0);
  assert.deepEqual(await f.jobs.list(), []);

  const prepare = selected(state, f.lead.id, 'prepare');
  state = prepare.state;
  assert.deepEqual(prepare.command.body.activationLeadId, f.lead.id);
  const prepared = await sendBusinessCommand(prepare.command, fetcher);
  assert.equal(prepared.outcome, 'TARGET_READY');
  assert.equal(f.effects.hosting, 1);
  assert.equal(f.effects.dns, 1);
  assert.equal(generations, 0);
  assert.deepEqual(await f.jobs.list(), []);
  state = reduceBusinessDeliveryState(state, { type: 'result', command: prepare.command, result: prepared });
  state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: 'read', data: await fetchBusinessRead(fetcher) });
  assert.equal(state.data.partners[0].status, 'READY');
  const publish = selected(state, f.lead.id, 'publish');
  const published = await sendBusinessCommand(publish.command, fetcher);
  assert.equal(published.outcome, 'ENQUEUED');
  assert.equal(published.job.status, 'QUEUED');
  assert.equal(published.activationLeadId, f.lead.id);
  assert.equal(published.publicHost, f.target.publicHost);
  assert.equal(generations, 1);
  assert.equal((await f.jobs.list()).length, 1);
  const queued = await fetchBusinessRead(fetcher);
  assert.equal(queued.partners[0].status, 'QUEUED');
  assert.notEqual(queued.partners[0].status, 'CURRENT');
  const sourceBytes = await readFile(f.sourcePath, 'utf8');
  const source = JSON.parse(sourceBytes);
  assert.equal(source.ecosystemType, 'BUSINESS');
  assert.equal(source.site.id, f.target.siteId);
  assert.equal(source.site.domain, f.target.publicHost);
  assert.equal(source.distributor.purchaseUrl, undefined);
  assert.match(source.cta.primaryUrl, /^https:\/\/wa.me\/573101234567/);

  // A lost HTTP response must be retried with the identical model-produced command.
  const replay = await sendBusinessCommand(publish.command, fetcher);
  assert.equal(replay.operationId, published.operationId);
  assert.equal(replay.job.id, published.job.id);
  assert.equal(generations, 1);
  assert.equal((await f.jobs.list()).length, 1);
  assert.equal(await readFile(f.sourcePath, 'utf8'), sourceBytes);
  const worker = createBusinessFixtureWorker(f);
  assert.equal((await worker.runNext()).outcome, 'SUCCEEDED');
  const current = await fetchBusinessRead(fetcher);
  assert.equal(current.partners[0].status, 'CURRENT');
  assert.equal(current.partners[0].currentJob.status, 'SUCCEEDED');
  assert.equal(current.partners[0].currentJob.phase, 'COMPLETE');
  assert.equal(await readFile(f.productPath, 'utf8'), productBytes);
  assert.equal(await readFile(f.rootPath, 'utf8'), apexBytes);
  assert.deepEqual(calls.map(({ path }) => path), [root, `${root}/prepare-target`, root, `${root}/publish`, root, `${root}/publish`, root]);
});

test('client command with stale commercial review is 409 before generation or providers', async (t) => {
  const f = await createMasterSitesBusinessCommandFixture(t);
  const auth = await identity();
  let generations = 0;
  const commands = createMasterSitesBusinessCommandService({ ...f.dependencies,
    async generate(...args) { generations++; return productPageGenerationService.generate(...args); }
  });
  const handlers = createMasterSitesBusinessRouteHandlers({ authorize: auth.authorize, services: () => ({ preview: f.preview, commands }) });
  const fetcher = inMemoryFetcher(handlers, await auth.token(), []);
  const state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: 'read', data: await fetchBusinessRead(fetcher) });
  const publish = selected(state, f.lead.id, 'publish').command;
  f.lead.status = 'CANCELLED';
  await writeFile(f.leadPath, JSON.stringify([f.lead]));
  await assert.rejects(sendBusinessCommand(publish, fetcher), (error) => error instanceof BusinessDeliveryHttpError
    && error.status === 409 && !error.message.includes('MASTER_SITES_'));
  assert.equal(generations, 0);
  assert.deepEqual(f.effects, { hosting: 0, dns: 0, wakes: 0 });
  assert.deepEqual(await f.jobs.list(), []);
  assert.equal(await f.operations.get(publish.body.requestId), null);
  await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
});

test('client receives safe denial for absent, nonmember, service, and unconfigured admin identity before services', async (t) => {
  const f = await createMasterSitesBusinessCommandFixture(t);
  const auth = await identity();
  const command = { action: 'publish', body: await f.publishCommand() };
  const cases = [
    { name: 'absent', jwt: undefined, status: 401, authorize: auth.authorize },
    { name: 'nonmember', jwt: await auth.token({ email: 'other@example.test' }), status: 403, authorize: auth.authorize },
    { name: 'service', jwt: await auth.token({ service: true }), status: 403, authorize: auth.authorize },
    { name: 'unconfigured', jwt: await auth.token(), status: 403,
      authorize: createMasterSitesOperatorAuthorizer({ source: { ...config, MASTER_SITES_SUPER_ADMIN_EMAILS: '' }, keyResolver: auth.keyResolver }) }
  ];
  for (const scenario of cases) {
    let dispatches = 0;
    const handlers = createMasterSitesBusinessRouteHandlers({ authorize: scenario.authorize,
      services: () => { dispatches++; throw new Error('private-path secret provider exception'); } });
    const fetcher = inMemoryFetcher(handlers, scenario.jwt, []);
    await assert.rejects(fetchBusinessRead(fetcher), (error) => error instanceof BusinessDeliveryHttpError
      && error.status === scenario.status && !error.message.includes('private-path'));
    await assert.rejects(sendBusinessCommand(command, fetcher), (error) => error instanceof BusinessDeliveryHttpError
      && error.status === scenario.status && !error.message.includes('private-path'));
    assert.equal(dispatches, 0, scenario.name);
  }
  assert.deepEqual(await f.jobs.list(), []);
  assert.deepEqual(f.effects, { hosting: 0, dns: 0, wakes: 0 });
  await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
});
