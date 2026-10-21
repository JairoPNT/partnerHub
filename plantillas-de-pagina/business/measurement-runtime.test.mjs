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
  assert.equal(readyHarness.requests.length, 0, 'readiness alone is not consent');
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

const readyConfig = (providers = { ga4: true, meta: true }) => {
  const config = businessConfig(); config.businessMeasurement.providers = providers; return config;
};
const accept = (h, choice = { analytics: true, marketing: true }) => api(h).setConsent(choice);
const events = (h, name) => h.sdkCalls.filter((call) => call.args[1] === name);

// Break caught: readiness bypasses consent or rejects still queue/load tags.
test('zero_requests_before_choice_and_after_reject', () => {
  const h = harness({ config: readyConfig() });
  h.click(h.anchor()); api(h).withdraw(); h.click(h.anchor());
  assert.equal(h.requests.length, 0); assert.equal(h.sdkCalls.length, 0);
  accept(h); assert.equal(h.requests.length, 2, 'positive control: choice unlocks ready adapters');
});

// Break caught: category or readiness gates ignored; empty IDs produce loaders.
test('only_chosen_ready_provider_loads', async () => {
  for (const [providers, choice, expected] of [
    [{ ga4: true, meta: true }, { analytics: true, marketing: false }, 'ga4'],
    [{ ga4: true, meta: true }, { analytics: false, marketing: true }, 'meta'],
    [{ ga4: false, meta: true }, { analytics: true, marketing: true }, 'meta'],
    [{ ga4: true, meta: false }, { analytics: true, marketing: true }, 'ga4'],
  ]) {
    const h = harness({ config: readyConfig(providers) }); accept(h, choice);
    assert.equal(h.requests.length, 1); await h.loadSdk(expected);
    assert.ok(h.sdkCalls.every((call) => call.provider === expected));
  }
  const config = readyConfig(); config.analytics.measurementId = ''; config.integrations.meta.pixelId = '';
  const h = harness({ config }); accept(h); assert.equal(h.requests.length, 0);
});

// Break caught: accepting again creates another loader/pageview; unsafe provider config.
test('accept_twice_one_sdk_and_pageview', async () => {
  const h = harness({ config: readyConfig() }); accept(h); accept(h);
  assert.deepEqual(h.requests.map((r) => r.url).sort(), [
    'https://connect.facebook.net/en_US/fbevents.js',
    'https://www.googletagmanager.com/gtag/js?id=G-TEST12345',
  ]);
  assert.ok(h.requests.every((r) => r.element.referrerPolicy === 'no-referrer'));
  await h.loadSdk('ga4'); await h.loadSdk('meta'); accept(h);
  assert.equal(events(h, 'page_view').length, 1); assert.equal(events(h, 'PageView').length, 1);
  const gaConfig = h.sdkCalls.find((c) => c.provider === 'ga4' && c.args[0] === 'config');
  assert.deepEqual(plain(gaConfig.args), ['config', 'G-TEST12345', {
    send_page_view: false, page_location: 'https://negocio.example.test/', page_referrer: '',
    page_title: 'Business', allow_google_signals: false, allow_ad_personalization_signals: false,
  }]);
  const autoIndex = h.sdkCalls.findIndex((c) => c.args[1] === 'autoConfig');
  const initIndex = h.sdkCalls.findIndex((c) => c.provider === 'meta' && c.args[0] === 'init');
  assert.ok(autoIndex >= 0 && autoIndex < initIndex);
  assert.deepEqual(plain(h.sdkCalls[autoIndex].args), ['set', 'autoConfig', false, '123456789012345']);
  assert.deepEqual(plain(h.sdkCalls[initIndex].args), ['init', '123456789012345']);
  const consentCalls = h.sdkCalls.filter((c) => c.provider === 'ga4' && c.args[0] === 'consent');
  assert.ok(consentCalls.length >= 1);
  assert.ok(consentCalls.every((c) => c.args[2].ad_storage === 'denied' &&
    c.args[2].ad_user_data === 'denied' && c.args[2].ad_personalization === 'denied'));
});

// Break caught: replaying old clicks or queueing clicks while SDK is pending.
test('preconsent_click_is_not_replayed', async () => {
  const h = harness({ config: readyConfig() }); const anchor = h.anchor();
  h.click(anchor); accept(h); h.click(anchor);
  await h.loadSdk('ga4'); await h.loadSdk('meta');
  assert.equal(events(h, 'click_cta').length, 0); assert.equal(events(h, 'WhatsAppClick').length, 0);
  h.click(anchor); assert.equal(events(h, 'click_cta').length, 1);
  assert.equal(events(h, 'WhatsAppClick').length, 1);
});

// Break caught: a late onload revives state, queues init, or emits after withdrawal.
test('withdraw_during_load_drops_callbacks', async () => {
  const h = harness({ config: readyConfig() }); accept(h);
  const denied = api(h).withdraw(); assert.equal(denied.reloadRequired, true);
  assert.equal(JSON.parse(h.storage.getItem(KEY)).analytics, false);
  await h.loadSdk('ga4'); await h.loadSdk('meta'); h.click(h.anchor()); accept(h);
  assert.equal(events(h, 'page_view').length, 0); assert.equal(events(h, 'PageView').length, 0);
  assert.equal(events(h, 'click_cta').length, 0); assert.equal(events(h, 'WhatsAppClick').length, 0);
  assert.equal(h.sdkCalls.some((c) => c.args[0] === 'init' || c.args[0] === 'config'), false);
  assert.equal(h.window['ga-disable-G-TEST12345'], true);
  assert.equal(h.requests.length, 2, 'reloadRequired requests a clean navigation via UI; no auto reload');
});

// Break caught: another tab grants consent implicitly, or denial does not revoke adapters.
test('storage_event_revokes_without_regrant', async () => {
  const h = harness({ config: readyConfig() });
  h.storageEvent(saved({ marketing: true })); assert.equal(api(h).getState().analytics, false);
  accept(h); await h.loadSdk('ga4'); await h.loadSdk('meta');
  h.storageEvent(saved({ analytics: false, marketing: true }));
  assert.equal(api(h).getState().analytics, false); assert.equal(api(h).getState().marketing, true);
  const count = h.sdkCalls.length; h.click(h.anchor());
  assert.equal(h.sdkCalls.length, count, 'document quarantined until clean reload');
  h.storageEvent(saved()); assert.equal(api(h).getState().analytics, false);
  assert.equal(api(h).getState().marketing, false, 'a later denial may remove another category');
  assert.equal(api(h).getState().reloadRequired, true);
  assert.ok(h.sdkCalls.some((c) => c.provider === 'meta' && c.args[0] === 'consent' && c.args[1] === 'revoke'));
});

// Break caught: duplicate same event, synthetic event, missing nested/keyboard click or lost subsequent click.
test('nested_target_keyboard_and_two_distinct_clicks', async () => {
  const h = harness({ config: readyConfig() }); accept(h); await h.loadSdk('ga4'); await h.loadSdk('meta');
  const anchor = h.anchor(); const icon = h.document.createElement('span'); anchor.appendChild(icon);
  const first = h.click(icon, { detail: 0 }); h.document.dispatchEvent(first); h.click(icon);
  h.click(icon, { isTrusted: false });
  assert.equal(events(h, 'click_cta').length, 2); assert.equal(events(h, 'WhatsAppClick').length, 2);
  assert.equal(first.defaultPrevented, false);
  for (const [id, placement] of [['header', 'header'], ['main-vsl-cta', 'hero_primary'],
    ['secondary-vsl-cta', 'hero_secondary'], ['btnRegisterFinal', 'final_primary'],
    ['btnContactNegocioWa', 'final_secondary']]) {
    h.click(h.anchor(id));
    assert.deepEqual(plain(events(h, 'click_cta').at(-1).args[2]), { placement, destination: 'whatsapp' });
  }
  const count = events(h, 'click_cta').length;
  for (const [id, href] of [['unknown', 'https://wa.me/573001112233'],
    ['main-vsl-cta', 'https://wa.me/573009999999'], ['main-vsl-cta', 'https://wa.me.evil.test/573001112233'],
    ['main-vsl-cta', 'https://example.test/register']]) h.click(h.anchor(id, href));
  assert.equal(events(h, 'click_cta').length, count);
});

// Break caught: own payload leaks CONFIG, DOM labels, href/message, identity, or unknown events.
test('payload_excludes_url_phone_message_identity', async () => {
  const config = readyConfig(); config.ownerKey = 'PRIVATE_OWNER_SEED';
  config.distributor.name = 'PRIVATE_NAME_SEED';
  const h = harness({ config }); accept(h); await h.loadSdk('ga4'); await h.loadSdk('meta');
  const anchor = h.anchor(); anchor.textContent = 'PRIVATE_LABEL_SEED'; h.click(anchor);
  const output = JSON.stringify(h.sdkCalls);
  for (const sensitive of ['573001112233', 'PRIVATE_', 'wa.me', 'ownerKey']) assert.ok(!output.includes(sensitive), sensitive);
  assert.deepEqual(plain(events(h, 'WhatsAppClick')[0].args), ['trackCustom', 'WhatsAppClick', {
    placement: 'hero_primary', destination: 'whatsapp',
  }]);
  assert.deepEqual(h.sdkCalls.filter((c) => ['event', 'track', 'trackCustom'].includes(c.args[0]))
    .map((c) => c.args[1]).sort(), ['PageView', 'WhatsAppClick', 'click_cta', 'page_view'].sort());
});

// Break caught: piggybacking an unowned SDK/queue/script leaks to another ID or unsafe controls.
test('unowned_existing_sdk_is_blocked', async () => {
  for (const existing of [{ gtag() {} }, { dataLayer: [] }, { fbq() {} }, { _fbq() {} }]) {
    const h = harness({ config: readyConfig(), existing }); accept(h);
    const affected = ('gtag' in existing || 'dataLayer' in existing) ? 'googletagmanager' : 'facebook';
    assert.equal(h.requests.some((r) => r.url.includes(affected)), false);
    assert.equal(h.requests.length, 1, 'unaffected provider still eligible');
  }
  const h = harness({ config: readyConfig() });
  const foreign = h.document.createElement('script'); foreign.src = 'https://www.googletagmanager.com/gtag/js?id=G-OTHER';
  h.document.head.appendChild(foreign); accept(h);
  assert.equal(h.requests.filter((r) => r.url.includes('googletagmanager')).length, 1);
});

// Break caught: SDK observes sensitive URL/referrer despite clean custom parameters.
test('unsafe_context_blocks_both_providers_including_changes_during_load', async () => {
  for (const fixture of [{ origin: 'https://negocio.example.test/?email=PRIVATE_EMAIL' },
    { origin: 'https://negocio.example.test/#PRIVATE_HASH' },
    { origin: 'https://negocio.example.test/PRIVATE_PATH' },
    { referrer: 'https://example.test/?phone=PRIVATE_PHONE' }]) {
    const h = harness({ ...fixture, config: readyConfig() }); accept(h); h.click(h.anchor());
    assert.equal(h.requests.length, 0); assert.equal(h.sdkCalls.length, 0);
  }
  const h = harness({ config: readyConfig() }); accept(h);
  h.window.location.hash = '#PRIVATE_LATE'; await h.loadSdk('ga4'); await h.loadSdk('meta');
  assert.equal(events(h, 'page_view').length, 0); assert.equal(events(h, 'PageView').length, 0);
  assert.equal(api(h).getState().reloadRequired, true);
});

// Break caught: storage cannot persist a denial but runtime automatically restores a stale grant.
test('storage_failure_never_automatically_reloads_stale_grant', async () => {
  const h = harness({ config: readyConfig() }); accept(h); await h.loadSdk('ga4');
  h.storage.failures.write = true; h.storage.failures.remove = true;
  const denied = api(h).withdraw(); assert.equal(denied.persistence, 'session');
  assert.equal(denied.reloadRequired, true); assert.equal(denied.analytics, false);
  await h.flush(); assert.equal(h.requests.some((r) => r.kind === 'reload'), false);
  h.click(h.anchor()); assert.equal(events(h, 'click_cta').length, 0);
});

// Break caught: failed loader prevents navigation, retries/replays, or emits on later success.
test('failed_sdk_keeps_whatsapp_navigable_and_does_not_retry', async () => {
  const h = harness({ config: readyConfig() }); accept(h);
  await h.loadSdk('ga4', { error: true }); await h.loadSdk('meta', { error: true });
  const click = h.click(h.anchor()); accept(h);
  assert.equal(click.defaultPrevented, false); assert.equal(h.requests.length, 2);
  await h.loadSdk('ga4'); await h.loadSdk('meta');
  assert.equal(events(h, 'page_view').length, 0); assert.equal(events(h, 'PageView').length, 0);
});

// Break caught: a cleared/corrupt preference still claims durable consent or keeps active SDKs.
test('cross_tab_clear_or_corruption_removes_persistence_claim', async () => {
  for (const newValue of [null, 'bad-json', saved({ extra: 'PRIVATE_STORAGE_SEED' }), saved({ expiresAt: NOW })]) {
    const h = harness({ config: readyConfig() }); accept(h); await h.loadSdk('ga4'); await h.loadSdk('meta');
    h.storageEvent(newValue);
    const state = api(h).getState();
    assert.equal(state.analytics, false); assert.equal(state.marketing, false);
    assert.equal(state.persistence, 'none'); assert.equal(state.expiresAt, null);
    assert.equal(state.reloadRequired, true);
    h.click(h.anchor()); assert.equal(events(h, 'click_cta').length, 0);
  }
});

// Break caught: expiry only disables the public API but leaves the own emitter/loaded SDK enabled.
test('expiry_revokes_loaded_providers_and_duplicate_execution_does_not_double_click', async () => {
  const h = harness({ config: readyConfig() }); accept(h); await h.loadSdk('ga4'); await h.loadSdk('meta');
  const script = h.document.createElement('script');
  script.textContent = readFileSync(new URL('./measurement-runtime.js', import.meta.url), 'utf8');
  h.document.head.appendChild(script); h.click(h.anchor());
  assert.equal(events(h, 'click_cta').length, 1); assert.equal(events(h, 'WhatsAppClick').length, 1);
  h.clock.now = NOW + TTL; await h.flush();
  assert.equal(api(h).getState().analytics, false); assert.equal(api(h).getState().reloadRequired, true);
  assert.equal(h.window['ga-disable-G-TEST12345'], true);
  h.click(h.anchor()); accept(h);
  assert.equal(events(h, 'click_cta').length, 1); assert.equal(events(h, 'page_view').length, 1);
  assert.equal(events(h, 'PageView').length, 1); assert.equal(h.requests.length, 2);
});
