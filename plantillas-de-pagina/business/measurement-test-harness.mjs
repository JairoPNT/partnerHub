import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const runtimePath = new URL('./measurement-runtime.js', import.meta.url);

export function businessConfig() {
  return {
    ecosystemType: 'BUSINESS',
    site: { id: 'fixture-business', domain: 'negocio.example.test' },
    analytics: { measurementId: 'G-TEST12345' },
    integrations: { meta: { pixelId: '123456789012345' } },
    distributor: { whatsappNumber: '573001112233', defaultMessage: 'PRIVATE_MESSAGE_SEED' },
    businessMeasurement: {
      version: 1, expectedOrigin: 'https://negocio.example.test',
      providers: { ga4: false, meta: false },
    },
  };
}

// Only browser boundaries are faked: the consent code is always the real asset.
export function createBusinessMeasurementHarness({
  config = businessConfig(), origin = 'https://negocio.example.test', stored,
  now = 1792540800000, storageError = false, referrer = '', existing = {},
} = {}) {
  const requests = [];
  const sdkCalls = [];
  const clock = { now };
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const values = new Map(typeof stored === 'string'
    ? [[`ph:business-consent:v1:${config?.site?.id}`, stored]]
    : Object.entries(stored ?? {}));
  const storage = {
    values, writes: [], failures: { read: storageError, write: storageError, remove: storageError },
    getItem(key) { if (this.failures.read) throw new Error('Storage read blocked'); return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.failures.write) throw new Error('Storage write blocked');
      values.set(key, String(value)); this.writes.push([key, String(value)]);
    },
    removeItem(key) { if (this.failures.remove) throw new Error('Storage remove blocked'); values.delete(key); },
    clear() { if (this.failures.remove) throw new Error('Storage remove blocked'); values.clear(); },
  };
  function eventTarget(name) {
    return {
      addEventListener(type, listener) {
        const key = `${name}:${type}`;
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(listener);
      },
      removeEventListener(type, listener) { listeners.get(`${name}:${type}`)?.delete(listener); },
      dispatchEvent(event) {
        for (const listener of listeners.get(`${name}:${event.type}`) ?? []) listener.call(this, event);
        return !event.defaultPrevented;
      },
    };
  }
  let context;
  function element(tagName) {
    const node = Object.assign(eventTarget(`element:${nextTimer++}`), {
      tagName: tagName.toUpperCase(), children: [], textContent: '', parentElement: null,
      setAttribute(name, value) { this[name] = String(value); },
      getAttribute(name) { return this[name] ?? null; },
      appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        if (child.src && child.tagName !== 'IMG') requests.push({
          kind: child.tagName === 'SCRIPT' ? 'script' : 'element', url: child.src, element: child,
        });
        else if (child.tagName === 'SCRIPT' && child.textContent) vm.runInContext(child.textContent, context);
        return child;
      },
      closest(selector) {
        let current = this;
        while (current) {
          if (selector === 'a' && current.tagName === 'A') return current;
          if (selector === 'header' && current.tagName === 'HEADER') return current;
          current = current.parentElement;
        }
        return null;
      },
      classList: { contains(name) { return name === 'bind-cta-primary'; } },
    });
    if (node.tagName === 'IMG') {
      let imageSource = '';
      Object.defineProperty(node, 'src', { get() { return imageSource; }, set(url) {
        imageSource = String(url); requests.push({ kind: 'image', url: imageSource, element: node });
      } });
    }
    return node;
  }
  const document = Object.assign(eventTarget('document'), {
    referrer, readyState: 'complete', createElement: element,
    querySelector() { return null; }, querySelectorAll(selector) {
      return selector === 'script[src]' ? document.head.children.filter((node) => node.src) : [];
    },
    head: element('head'), body: element('body'),
  });
  const location = new URL(origin);
  location.reload = () => requests.push({ kind: 'reload' });
  const window = Object.assign(eventTarget('window'), {
    document, location, localStorage: storage,
    navigator: { sendBeacon(url, data) { requests.push({ kind: 'beacon', url, data }); return true; } },
    fetch(url, options) { requests.push({ kind: 'fetch', url, options }); return Promise.reject(new Error('Offline fixture')); },
    Image: class { set src(url) { requests.push({ kind: 'image', url }); } },
    XMLHttpRequest: class {
      open(method, url) { this.method = method; this.url = url; }
      send(data) { requests.push({ kind: 'xhr', method: this.method, url: this.url, data }); }
    },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  });
  Object.assign(window, existing);
  window.window = window;
  class FixtureDate extends Date { static now() { return clock.now; } }
  context = vm.createContext({ ...window, window, document, URL, Date: FixtureDate });
  if (config !== undefined) {
    // CONFIG is a lexical const in production config.js, not a window property.
    context.__fixtureConfig = config;
    vm.runInContext('const CONFIG = __fixtureConfig; delete globalThis.__fixtureConfig;', context);
  }
  // Missing asset during RED means API absent, not a filesystem/harness failure.
  if (existsSync(runtimePath)) vm.runInContext(readFileSync(runtimePath, 'utf8'), context, { filename: 'measurement-runtime.js' });
  return {
    window, document, clock, storage, requests, sdkCalls,
    anchor(id = 'main-vsl-cta', href = 'https://wa.me/573001112233?text=PRIVATE_MESSAGE_SEED') {
      const anchor = element('a'); anchor.id = id === 'header' ? '' : id; anchor.href = href;
      const parent = element(id === 'header' ? 'header' : 'div'); parent.appendChild(anchor);
      return anchor;
    },
    storageEvent(newValue, options = {}) {
      if (newValue === null) values.delete(`ph:business-consent:v1:${config?.site?.id}`);
      else values.set(`ph:business-consent:v1:${config?.site?.id}`, newValue);
      window.dispatchEvent({ type: 'storage', key: `ph:business-consent:v1:${config?.site?.id}`,
        newValue, storageArea: storage, ...options });
    },
    async loadSdk(provider, { error = false } = {}) {
      const request = requests.find((item) => item.kind === 'script' && item.url.includes(
        provider === 'ga4' ? 'googletagmanager.com' : 'connect.facebook.net'));
      if (!request) throw new Error(`No ${provider} loader`);
      await Promise.resolve();
      if (error) { request.element.onerror?.(); return; }
      // Fake only the remote transport: record arguments consumed by the real stubs.
      if (provider === 'ga4' && window.dataLayer) {
        for (const args of window.dataLayer) sdkCalls.push({ provider, args: Array.from(args) });
        window.dataLayer.push = (args) => { sdkCalls.push({ provider, args: Array.from(args) }); return 1; };
      }
      if (provider === 'meta' && window.fbq) {
        const queue = window.fbq.queue;
        for (const args of queue) sdkCalls.push({ provider, args: Array.from(args) });
        window.fbq.callMethod = (...args) => sdkCalls.push({ provider, args });
        queue.length = 0;
      }
      request.element.onload?.();
    },
    click(target, options = {}) {
      const event = { type: 'click', target, isTrusted: true, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }, ...options };
      document.dispatchEvent(event); return event;
    },
    async flush() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } await Promise.resolve(); },
    dispose() { timers.clear(); listeners.clear(); },
  };
}
