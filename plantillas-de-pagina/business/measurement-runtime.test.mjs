import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { businessConfig, createBusinessMeasurementHarness as harness } from './measurement-test-harness.mjs';

const NOW = 1792540800000;
const KEY = 'ph:business-consent:v1:fixture-business';
const TTL = 15552000000;
const saved = (overrides = {}) => JSON.stringify({
  policyVersion: '2026-10-21', analytics: true, marketing: false, expiresAt: NOW + TTL, ...overrides,
});
const plain = (value) => JSON.parse(JSON.stringify(value));
function api(h) {
  assert.equal(typeof h.window.PartnerHubBusinessConsent?.getState, 'function', 'runtime must expose consent API');
  return h.window.PartnerHubBusinessConsent;
}

// Break caught: a default grant or leaked config in the public state.
test('initial_state_denies_both', () => {
  const h = harness();
  const state = api(h).getState();
  assert.deepEqual(plain(state), {
    policyVersion: '2026-10-21', analytics: false, marketing: false, expiresAt: null,
    persistence: 'none', runtimeEnabled: true, reloadRequired: false,
  });
  assert.ok(Object.isFrozen(state));
  assert.notEqual(state, api(h).getState());
  assert.throws(() => { state.analytics = true; }, TypeError);
  assert.equal(api(h).getState().analytics, false);
  h.window.dispatchEvent({ type: 'close' });
  assert.equal(api(h).getState().analytics, false);
  assert.equal(h.storage.writes.length, 0);
  assert.equal(h.requests.length, 0);
});

// Break caught: coercion, missing/extra keys or invalid calls changing consent/storage.
test('acceptance_is_strict_and_categories_independent', () => {
  const h = harness(); const consent = api(h);
  const events = [];
  h.window.addEventListener('partnerhub:business-consent-change', (event) => events.push(event.detail));
  assert.equal(consent.setConsent({ analytics: true, marketing: false }).marketing, false);
  const before = plain(consent.getState()); const writes = h.storage.writes.length;
  for (const invalid of [null, undefined, [], true, {}, { analytics: true },
    { analytics: true, marketing: 1 }, { analytics: 'true', marketing: false },
    { analytics: true, marketing: false, extra: false },
    Object.assign(Object.create({ marketing: false }), { analytics: true }),
    Object.defineProperty({ analytics: true, marketing: false }, 'extra', { value: false }),
    { analytics: true, marketing: false, [Symbol('extra')]: false },
    { get analytics() { return true; }, marketing: false }]) {
    assert.throws(() => consent.setConsent(invalid), { name: 'TypeError' });
    assert.deepEqual(plain(consent.getState()), before);
    assert.equal(h.storage.writes.length, writes);
  }
  assert.equal(events.length, 1);
  assert.deepEqual(plain(events[0]), before);
  assert.ok(Object.isFrozen(events[0]));
  const state = consent.setConsent({ analytics: false, marketing: true });
  assert.equal(state.analytics, false); assert.equal(state.marketing, true);
  const denied = consent.withdraw();
  assert.equal(denied.analytics, false); assert.equal(denied.marketing, false);
  assert.equal(denied.reloadRequired, false);
  assert.equal(events.length, 3); assert.equal(h.requests.length, 0);
});

// Break caught: wrong TTL, overbroad persisted payload or consent surviving expiry/clock rollback.
test('ttl_is_180_days', () => {
  const h = harness({ now: NOW }); const consent = api(h);
  const state = consent.setConsent({ analytics: true, marketing: false });
  assert.equal(state.expiresAt, NOW + 180 * 24 * 60 * 60 * 1000);
  assert.equal(state.persistence, 'local');
  assert.deepEqual(JSON.parse(h.storage.getItem(KEY)), {
    policyVersion: '2026-10-21', analytics: true, marketing: false, expiresAt: NOW + TTL,
  });
  h.clock.now = NOW + TTL;
  assert.equal(consent.getState().analytics, false);
  const rollback = harness({ stored: saved() });
  rollback.clock.now = NOW - 1;
  assert.equal(api(rollback).getState().analytics, false);
  assert.equal(h.requests.length, 0);
});

// Break caught: corrupt, extra-field, expired or impossible future storage granting consent.
test('invalid_or_expired_storage_denies', () => {
  for (const stored of ['not json', 'null', '[]', '{}', saved({ policyVersion: 'old' }),
    saved({ analytics: 'true' }), saved({ expiresAt: NOW }), saved({ expiresAt: NOW - 1 }),
    saved({ expiresAt: NOW + TTL + 1 }), saved({ expiresAt: 'tomorrow' }),
    saved({ expiresAt: NOW + 0.5 }), saved({ extra: 'forbidden' }),
    saved({ expiresAt: null })]) {
    const h = harness({ stored }); const state = api(h).getState();
    assert.equal(state.analytics, false, stored); assert.equal(state.marketing, false, stored);
    assert.equal(state.expiresAt, null, stored); assert.equal(state.persistence, 'none', stored);
    assert.equal(h.requests.length, 0);
  }
});

// Break caught: failed storage being treated as persistent or implicit acceptance on reload.
test('blocked_storage_is_session_only', () => {
  const h = harness({ stored: saved(), storageError: true }); const consent = api(h);
  assert.equal(consent.getState().analytics, false);
  const accepted = consent.setConsent({ analytics: true, marketing: false });
  assert.equal(accepted.analytics, true); assert.equal(accepted.persistence, 'session');
  assert.equal(accepted.expiresAt, NOW + TTL);
  assert.equal(h.storage.writes.length, 0);
  assert.equal(api(harness({ storageError: true })).getState().analytics, false);
  assert.equal(consent.withdraw().analytics, false);
  assert.equal(h.requests.length, 0);
});

// Break caught: permissive preview/origin/identity/metadata parsing bypassing default deny.
test('preview_wrong_origin_master_or_bad_config_never_loads', () => {
  const cases = [
    { origin: 'https://app.partnerhub.club' }, { origin: 'https://elsewhere.example.test' },
    { origin: 'http://negocio.example.test' }, { origin: 'https://negocio.example.test:444' },
    { origin: 'file:///tmp/preview.html' },
  ];
  for (const mutate of [
    (c) => { c.ecosystemType = 'PRODUCT'; }, (c) => { c.site.id = 'ganomaster-business'; },
    (c) => { delete c.businessMeasurement; }, (c) => { c.businessMeasurement.version = 2; },
    (c) => { c.businessMeasurement.extra = true; },
    (c) => { c.businessMeasurement.providers.ga4 = 'true'; },
    (c) => { c.businessMeasurement.providers.extra = true; },
    (c) => { c.businessMeasurement.expectedOrigin += '/'; },
    (c) => { c.site.domain = 'https://negocio.example.test'; },
    (c) => { c.site.domain += ':443'; }, (c) => { c.site.domain += '/'; },
    (c) => { c.site.domain = 'localhost'; c.businessMeasurement.expectedOrigin = 'https://localhost'; },
    (c) => { c.site.domain = '127.0.0.1'; c.businessMeasurement.expectedOrigin = 'https://127.0.0.1'; },
    (c) => { c.site.domain = 'app.partnerhub.club'; c.businessMeasurement.expectedOrigin = 'https://app.partnerhub.club'; },
    (c) => { c.site.id = '../another-site'; },
  ]) { const config = businessConfig(); mutate(config); cases.push({ config }); }
  cases.push({ config: null });
  for (const fixture of cases) {
    const h = harness({ ...fixture, stored: saved() }); const consent = api(h);
    assert.equal(consent.getState().runtimeEnabled, false, JSON.stringify(fixture));
    assert.equal(consent.getState().analytics, false);
    assert.equal(consent.setConsent({ analytics: true, marketing: true }).analytics, false);
    assert.equal(h.storage.writes.length, 0); assert.equal(h.requests.length, 0);
  }
});

// Break caught: wrong site key, readiness interpreted as consent, or reload forgetting choice.
test('reload_restores_only_same_site_and_origin_choice', () => {
  const h = harness(); api(h).setConsent({ analytics: true, marketing: false });
  const stored = Object.fromEntries(h.storage.values);
  assert.equal(api(harness({ stored })).getState().analytics, true);
  const config = businessConfig(); config.site.id = 'other-business';
  assert.equal(api(harness({ config, stored })).getState().analytics, false);
  assert.equal(api(harness({ origin: 'https://other.example.test', stored })).getState().analytics, false);
  const ready = businessConfig(); ready.businessMeasurement.providers = { ga4: true, meta: true };
  const readyHarness = harness({ config: ready });
  assert.equal(api(readyHarness).getState().analytics, false);
  api(readyHarness).setConsent({ analytics: true, marketing: true });
  assert.equal(readyHarness.requests.length, 0, 'Task1 must not implement loaders');
});

// Break caught: duplicate script evaluation resetting accepted state or dispatching extra events.
test('duplicate_execution_preserves_singleton_and_choice', () => {
  const h = harness(); const consent = api(h);
  consent.setConsent({ analytics: true, marketing: false });
  const events = [];
  h.window.addEventListener('partnerhub:business-consent-change', (event) => events.push(event));
  const script = h.document.createElement('script');
  script.textContent = readFileSync(new URL('./measurement-runtime.js', import.meta.url), 'utf8');
  h.document.head.appendChild(script);
  assert.equal(api(h), consent); assert.equal(consent.getState().analytics, true);
  assert.equal(events.length, 0); assert.equal(h.storage.writes.length, 1);
  assert.equal(h.requests.length, 0);
});

// Break caught: configured malformed IDs silently normalized or ignored as valid config.
test('malformed_recognized_ids_deny_but_unconfigured_categories_keep_api', () => {
  for (const [field, bad] of [['ga4', ' G-TEST12345'], ['ga4', 'G-TEST12345 '],
    ['ga4', 'https://example.test/tag'], ['ga4', 123], ['meta', '123<script>'],
    ['meta', 123456789012345], ['meta', '123 456789012345']]) {
    const config = businessConfig();
    if (field === 'ga4') config.analytics.measurementId = bad;
    else config.integrations.meta.pixelId = bad;
    const h = harness({ config, stored: saved() });
    assert.equal(api(h).getState().runtimeEnabled, false, `${field}: ${bad}`);
    assert.equal(api(h).getState().analytics, false);
    assert.equal(api(h).setConsent({ analytics: true, marketing: true }).analytics, false);
    assert.equal(h.requests.length, 0);
  }
  const config = businessConfig();
  delete config.analytics; delete config.integrations;
  const h = harness({ config });
  assert.equal(api(h).getState().runtimeEnabled, true);
  assert.equal(api(h).setConsent({ analytics: true, marketing: false }).analytics, true);
  assert.equal(h.requests.length, 0);
  const fallback = businessConfig();
  delete fallback.analytics;
  fallback.integrations.analytics = { measurementId: 'G-TEST12345' };
  assert.equal(api(harness({ config: fallback })).getState().runtimeEnabled, true);
  fallback.analytics = { measurementId: 'bad-primary' };
  assert.equal(api(harness({ config: fallback })).getState().runtimeEnabled, false);
  const canonical = businessConfig();
  canonical.integrations.meta.pixelId = '12345678901234567890123456789012';
  canonical.analytics.measurementId = 'g-test12345';
  assert.equal(api(harness({ config: canonical })).getState().runtimeEnabled, true,
    'accept IDs already supported by the existing generation schemas without normalization');
});

// Break caught: failed denial replacement leaving an earlier durable grant on reload.
test('withdraw_after_write_failure_removes_only_owned_stale_grant', () => {
  const otherKey = 'ph:business-consent:v1:other-business';
  const h = harness({ stored: { [otherKey]: saved() } });
  const consent = api(h);
  consent.setConsent({ analytics: true, marketing: true });
  assert.equal(api(harness({ stored: Object.fromEntries(h.storage.values) })).getState().marketing, true);
  h.storage.failures.write = true;
  const denied = consent.withdraw();
  assert.equal(denied.analytics, false);
  assert.equal(denied.marketing, false);
  assert.equal(denied.persistence, 'session');
  const restored = api(harness({ stored: Object.fromEntries(h.storage.values) })).getState();
  assert.equal(restored.analytics, false, 'reload must not restore stale analytics grant');
  assert.equal(restored.marketing, false, 'reload must not restore stale marketing grant');
  assert.equal(h.storage.getItem(otherKey), saved(), 'other site preference must remain intact');
  assert.equal(h.requests.length, 0);
});

// Break caught: claiming local durability or throwing when neither mutation is possible.
test('all_storage_mutations_blocked_keep_withdrawal_session_only', () => {
  const h = harness(); const consent = api(h);
  consent.setConsent({ analytics: true, marketing: true });
  h.storage.failures.write = true; h.storage.failures.remove = true;
  const denied = consent.withdraw();
  assert.equal(denied.analytics, false); assert.equal(denied.marketing, false);
  assert.equal(denied.persistence, 'session');
  assert.equal(consent.getState().analytics, false);
  assert.equal(JSON.parse(h.storage.getItem(KEY)).analytics, true,
    'browser prevented both persistent mutations; in-memory denial is not durable');
  assert.equal(h.requests.length, 0);
});
