import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const denied = { policyVersion: '2026-10-21', analytics: false, marketing: false,
  expiresAt: null, persistence: 'none', runtimeEnabled: true, reloadRequired: false };

// DOM and runtime are the boundaries; the controller is always the actual app.js.
function fixture({ missing = false, noEvents = false, state: initial = {}, fail = '', result, withdrawResult } = {}) {
  const nodes = new Map(); const docListeners = new Map(); const winListeners = new Map();
  const calls = []; let state = { ...denied, ...initial }; let failure = fail;
  let document;
  const listeners = (map, type, fn) => map.set(type, [...(map.get(type) || []), fn]);
  const emit = (map, type, event = {}) => (map.get(type) || []).forEach(fn => fn({ type, preventDefault() { this.defaultPrevented = true; }, ...event }));
  function element(id, attrs = {}) {
    const handlers = new Map(); const attributes = new Map(Object.entries(attrs));
    return { id, hidden: Object.hasOwn(attrs, 'hidden'), disabled: Object.hasOwn(attrs, 'disabled'), checked: false, open: false, textContent: '',
      style: { setProperty() {} }, classList: { add() {}, remove() {}, contains() { return false; } },
      getAttribute: key => attributes.get(key), setAttribute: (key,val) => attributes.set(key,String(val)),
      addEventListener: (type, fn) => listeners(handlers, type, fn),
      focus() { document.activeElement = this; },
      click() { if (!this.disabled) emit(handlers, 'click', { target: this }); },
      dispatch(type, event = {}) { emit(handlers, type, { target: this, ...event }); },
      showModal() { this.open = true; }, close() { this.open = false; emit(handlers, 'close'); }
    };
  }
  for (const match of html.matchAll(/<[^>]+\bid="(business-consent-[^"]+)"[^>]*>/g)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m => [m[1],m[2] || '']));
    nodes.set(match[1], element(match[1], attrs));
  }
  document = { body: { style: {} }, documentElement: element('html'), activeElement: null,
    getElementById: id => nodes.get(id) || null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type,fn) => listeners(docListeners,type,fn) };
  const api = Object.freeze({
    getState() { if (failure === 'get') throw Error('unavailable'); return Object.freeze({ ...state }); },
    setConsent(choice) {
      if (failure === 'set') throw Error('unavailable');
      calls.push({ method: 'setConsent', choice: JSON.parse(JSON.stringify(choice)) });
      state = result || { ...state, ...choice, persistence: 'session' };
      emit(winListeners, 'partnerhub:business-consent-change');
      return Object.freeze({ ...state });
    },
    withdraw() {
      if (failure === 'withdraw') throw Error('unavailable');
      calls.push({ method: 'withdraw' }); state = withdrawResult || { ...state, analytics: false, marketing: false, persistence: 'session' };
      emit(winListeners, 'partnerhub:business-consent-change'); return Object.freeze({ ...state });
    }
  });
  const forbidden = () => { throw Error('UI crossed storage/network/tracking boundary'); };
  const window = { CONFIG: {}, PartnerHubBusinessConsent: missing ? undefined : api,
    addEventListener: (type, fn) => listeners(winListeners,type,fn), fetch: forbidden, gtag: forbidden, fbq: forbidden };
  if (noEvents) delete window.addEventListener;
  for (const owner of [window, document]) for (const name of ['localStorage','sessionStorage','cookie']) {
    Object.defineProperty(owner, name, { get: forbidden, set: forbidden });
  }
  const context = { window, document, console, fetch: forbidden, gtag: forbidden, fbq: forbidden };
  runInNewContext(app, context);
  const init = () => emit(docListeners,'DOMContentLoaded'); init();
  const get = name => { const node = nodes.get('business-consent-'+name); assert.ok(node, `missing consent control: ${name}`); return node; };
  return { get, calls, init, document, window, api, fail(value) { failure = value; },
    change(next) { state = { ...denied, ...next }; emit(winListeners,'partnerhub:business-consent-change', { detail: { analytics: true, marketing: true } }); },
    open() { get('configure').click(); }, key(key,shiftKey=false) { get('dialog').dispatch('keydown',{ key,shiftKey }); },
    current: () => ({ ...state }) };
}

test('unset_shows_equal_choice_actions without blocking document navigation', () => {
  const f = fixture(); assert.equal(f.get('banner').hidden,false);
  for (const id of ['accept','reject','configure']) { assert.equal(f.get(id).hidden,false); assert.equal(f.get(id).getAttribute('class'),'business-consent-button'); }
  assert.equal(f.get('analytics').checked,false); assert.equal(f.get('marketing').checked,false);
  assert.notEqual(f.document.body.style.overflow,'hidden'); assert.equal(f.get('dialog').open,false); assert.deepEqual(f.calls,[]);
});
test('accept_and_reject_send_complete_booleans and hide only on confirmed state', () => {
  for (const [button,choice] of [['accept',{analytics:true,marketing:true}],['reject',{analytics:false,marketing:false}]]) {
    const f = fixture(); f.get(button).click(); assert.deepEqual(f.calls,[{method:'setConsent',choice}]); assert.equal(f.get('banner').hidden,true);
  }
});
test('dismiss_does_not_save: cancel, native close, backdrop, Escape', () => {
  const f = fixture();
  for (const close of [() => f.get('cancel').click(), () => f.get('dialog').close(), () => f.get('dialog').dispatch('click'), () => f.get('dialog').dispatch('cancel')]) {
    f.open(); f.get('analytics').checked = true; close(); assert.equal(f.get('dialog').open,false); assert.deepEqual(f.calls,[]);
  }
});
test('save_selected_categories_only commits draft only on save', () => {
  const f = fixture(); f.open(); f.get('analytics').checked = true;
  assert.deepEqual(f.calls,[]); assert.equal(f.current().analytics,false); f.get('save').click();
  assert.deepEqual(f.calls,[{method:'setConsent',choice:{analytics:true,marketing:false}}]); assert.equal(f.get('dialog').open,false);
});
test('reopen_reads_latest_state and external revocation resets stale draft', () => {
  const f = fixture(); f.open(); f.get('analytics').checked = true; f.get('cancel').click();
  f.change({ persistence:'session',marketing:true }); f.get('reopen').click();
  assert.equal(f.get('analytics').checked,false); assert.equal(f.get('marketing').checked,true);
  f.get('analytics').checked = true; f.change({ persistence:'session' });
  assert.equal(f.get('analytics').checked,false); assert.equal(f.get('marketing').checked,false);
  f.get('save').click(); assert.deepEqual(f.calls,[{method:'setConsent',choice:{analytics:false,marketing:false}}]);
});
test('missing_api_never_grants and late API recovers through existing change event or reopen', () => {
  const f = fixture({missing:true}); assert.equal(f.get('accept').disabled,true); assert.equal(f.get('reject').disabled,true);
  f.open(); assert.equal(f.get('save').disabled,true); assert.match(f.get('status').textContent,/no están disponibles/);
  f.get('accept').click(); f.get('save').click(); assert.deepEqual(f.calls,[]);
  f.window.PartnerHubBusinessConsent=f.api; f.change({}); assert.equal(f.get('accept').disabled,false);
  f.get('cancel').click(); f.get('reopen').click(); f.get('save').click(); assert.equal(f.calls.length,1);
});
test('failed APIs and malformed or unconfirmed state never look accepted', () => {
  for (const options of [{fail:'get'},{fail:'set'},{result:{...denied,analytics:'true',persistence:'session'}},{result:denied},{state:{runtimeEnabled:false}}]) {
    const f = fixture(options); f.get('accept').click(); assert.equal(f.get('banner').hidden,false);
    assert.equal(f.get('analytics').checked,false); assert.match(f.get('status').textContent,/no están disponibles/);
  }
  const f = fixture(); f.open(); f.fail('withdraw'); f.get('withdraw').click(); assert.equal(f.get('analytics').checked,false); assert.match(f.get('status').textContent,/no están disponibles/);
});
test('reloadRequired prevents apparent regrant and preserves authoritative denied state', () => {
  const f = fixture(); f.open(); f.change({persistence:'session',reloadRequired:true});
  assert.equal(f.get('analytics').checked,false); assert.equal(f.get('save').disabled,true); assert.equal(f.get('accept').disabled,true);
  assert.match(f.get('status').textContent,/recarga/i); f.get('accept').click(); assert.deepEqual(f.calls,[]);
});
test('withdraw remains reachable from footer preferences', () => {
  const f = fixture(); f.get('accept').click(); f.get('reopen').click(); f.get('withdraw').click();
  assert.equal(f.calls.at(-1).method,'withdraw'); assert.equal(f.get('analytics').checked,false); assert.equal(f.get('marketing').checked,false);
});

test('quarantine withdrawal preserves clean-reload guidance and remains reachable without session persistence', () => {
  const quarantined = { ...denied, reloadRequired: true };
  const f = fixture({ withdrawResult: quarantined });
  f.get('accept').click(); f.get('reopen').click();
  f.change(quarantined);
  const guidance = f.get('status').textContent;
  assert.match(guidance, /recarga/i);
  f.get('withdraw').click();
  assert.deepEqual(f.current(), quarantined);
  assert.equal(f.get('status').textContent, guidance);
  assert.equal(f.get('banner-status').textContent, guidance);
  assert.equal(f.get('withdraw').disabled, false);
  assert.equal(f.get('banner').hidden, false);
  assert.equal(f.get('dialog').open, true);
  for (const name of ['analytics', 'marketing']) assert.equal(f.get(name).checked, false);
  for (const name of ['accept', 'reject', 'analytics', 'marketing', 'save']) assert.equal(f.get(name).disabled, true);
  f.get('withdraw').click();
  assert.deepEqual(f.calls.slice(1), [{ method: 'withdraw' }, { method: 'withdraw' }]);
});

test('withdrawal still rejects disabled, positive, malformed and unconfirmed responses', () => {
  for (const withdrawResult of [
    { ...denied },
    { ...denied, runtimeEnabled: false, reloadRequired: true },
    { ...denied, analytics: true, reloadRequired: true },
    { ...denied, marketing: true, reloadRequired: true },
    { ...denied, analytics: 'false', reloadRequired: true },
    { ...denied, reloadRequired: 'true' },
    { ...denied, persistence: 'local', reloadRequired: true }
  ]) {
    const f = fixture({ withdrawResult }); f.open(); f.get('withdraw').click();
    assert.match(f.get('status').textContent, /no están disponibles/);
    assert.equal(f.get('withdraw').disabled, true);
    assert.equal(f.get('analytics').checked, false); assert.equal(f.get('marketing').checked, false);
    assert.equal(f.get('banner').hidden, false);
  }
});
test('dialog focus wraps Tab, cancels Escape and returns to invoking control', () => {
  const f = fixture(); f.get('configure').focus(); f.open(); assert.equal(f.document.activeElement,f.get('analytics'));
  f.key('Tab',true); assert.equal(f.document.activeElement,f.get('withdraw'));
  f.key('Tab'); assert.equal(f.document.activeElement,f.get('analytics'));
  f.key('Escape'); assert.equal(f.get('dialog').open,false); assert.equal(f.document.activeElement,f.get('configure')); assert.deepEqual(f.calls,[]);
});
test('duplicate_init_has_one_handler and UI does not touch storage or emit tracking', () => {
  const f = fixture(); f.init(); f.init(); f.get('reject').click(); f.open(); f.get('cancel').click();
  assert.deepEqual(f.calls,[{method:'setConsent',choice:{analytics:false,marketing:false}}]);
});
test('an incomplete host event surface cannot break content initialization', () => {
  for (const missing of [true,false]) {
    const f = fixture({noEvents:true,missing});
    assert.equal(f.get('banner').hidden,false); assert.equal(f.get('accept').disabled,true);
    assert.match(f.get('status').textContent,/no están disponibles/); assert.deepEqual(f.calls,[]);
  }
});
