import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Compile the real shared/server consumers; only the server-only import marker is inert.
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { MASTER_SITE_IDS as uiIds, MASTER_SITE_DOMAINS as uiDomains, CANONICAL_URLS as uiUrls } from './lib/ecosystem-contracts';
      export { getMasterSiteDomainBySiteId, getMasterSiteDomain } from './server/services/ecosystemService';
      export { buildDomainInventory } from './server/services/domainInventoryBuilder';
      export { getCompatibleMasterHosts } from './server/services/partnerHostnameContract';
    `,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    loader: 'ts'
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'server-only-marker', setup(builder) {
    builder.onResolve({ filter: /^server-only$/ }, () => ({ path: 'marker', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export {};', loader: 'js' }));
  } }]
});
const contract = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

test('Master Sites Business link and form identity use the approved Spanish public hostname', () => {
  const site = { id: contract.uiIds.BUSINESS, domain: contract.uiDomains.BUSINESS };
  assert.deepEqual(site, { id: 'ganomaster-business', domain: 'negocio.ganomaster.pro' });
  assert.equal(contract.uiUrls.BUSINESS, 'https://negocio.ganomaster.pro');
  assert.equal(new URL(contract.uiUrls.BUSINESS).hostname, site.domain);
});

test('replication and master verification resolve the existing Business site ID to negocio', () => {
  assert.equal(contract.getMasterSiteDomain('BUSINESS'), 'negocio.ganomaster.pro');
  assert.equal(contract.getMasterSiteDomainBySiteId('ganomaster-business'), 'negocio.ganomaster.pro');
  assert.equal(contract.getMasterSiteDomainBySiteId('claudia-calero-business'), null);
  assert.deepEqual(contract.getCompatibleMasterHosts('BUSINESS'), ['negocio.ganomaster.pro', 'business.ganomaster.pro']);
});

test('domain inventory reports the actual Business master without inventing hosting readiness', () => {
  const inventory = contract.buildDomainInventory({ leads: [], sources: [], targets: [], verifications: [] });
  const business = inventory.filter(item => item.siteId === 'ganomaster-business');
  assert.equal(business.length, 1);
  assert.equal(business[0].hostname, 'negocio.ganomaster.pro');
  assert.equal(business[0].kind, 'MASTER');
  assert.equal(business[0].dnsState, 'UNKNOWN');
  assert.equal(business[0].sslState, 'UNKNOWN');
  assert.equal(business[0].publicationState, 'UNKNOWN');
});

test('Business master verification is never carried from an old or unidentified hostname', () => {
  for (const domain of ['business.ganomaster.pro', undefined, null, 'negocio.other.pro']) {
    const verifications = [{ siteId: 'ganomaster-business', domain, status: 'VERIFIED', verifiedAt: '2026-10-20T12:00:00Z' }];
    const before = structuredClone(verifications);
    const item = contract.buildDomainInventory({ leads: [], sources: [], targets: [], verifications })
      .find(value => value.siteId === 'ganomaster-business');
    assert.equal(item.verificationState, 'NOT_CHECKED');
    assert.equal(item.verifiedAt, undefined);
    assert.deepEqual(verifications, before, 'historical verification is preserved, not rewritten');
  }
});

test('Business master retains only evidence verified against its exact current public host', () => {
  for (const status of ['VERIFIED', 'VERIFY_FAILED']) {
    const item = contract.buildDomainInventory({ leads: [], sources: [], targets: [], verifications: [{
      siteId: 'ganomaster-business', domain: 'negocio.ganomaster.pro', status, verifiedAt: '2026-10-21T12:00:00Z'
    }] }).find(value => value.siteId === 'ganomaster-business');
    assert.equal(item.verificationState, status);
    assert.equal(item.verifiedAt, '2026-10-21T12:00:00Z');
  }
});

test('Product and Brand master destinations and IDs remain unchanged', () => {
  for (const [type, id, host] of [
    ['PRODUCT', 'ganomaster', 'product.ganomaster.pro'],
    ['PERSONAL_BRAND', 'ganomaster-personal-brand', 'brand.ganomaster.pro']
  ]) {
    assert.equal(contract.uiIds[type], id);
    assert.equal(contract.uiDomains[type], host);
    assert.equal(contract.uiUrls[type], `https://${host}`);
    assert.equal(contract.getMasterSiteDomainBySiteId(id), host);
    const item = contract.buildDomainInventory({ leads: [], sources: [], targets: [], verifications: [{
      siteId: id, status: 'VERIFIED', verifiedAt: '2026-10-20T12:00:00Z'
    }] }).find(value => value.siteId === id);
    assert.equal(item.verificationState, 'VERIFIED', 'unrelated master evidence behavior is unchanged');
  }
});
