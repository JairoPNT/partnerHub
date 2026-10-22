/* Business consent authority. Classic asset: config.js -> this file -> app.js. */
(function () {
  'use strict';

  if (Object.prototype.hasOwnProperty.call(window, 'PartnerHubBusinessConsent')) return;

  const POLICY_VERSION = '2026-10-21';
  const CHANGE_EVENT = 'partnerhub:business-consent-change';

  function exactRecord(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const ownKeys = Reflect.ownKeys(value);
    return ownKeys.length === keys.length && keys.every(function (key) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value');
    });
  }

  function validIdentity(config) {
    if (!config || config.ecosystemType !== 'BUSINESS' || !config.site) return false;
    const siteId = config.site.id;
    const domain = config.site.domain;
    if (typeof siteId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteId) ||
        siteId === 'ganomaster-business') return false;
    // Accept only the canonical hostname; URL normalization must never expand permission.
    if (typeof domain !== 'string' || domain.length > 253 ||
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ||
        domain === 'app.partnerhub.club' || domain === 'localhost' || domain.endsWith('.localhost')) return false;
    // Empty/absent IDs mean unconfigured; populated IDs must already be canonical.
    // Never replace a malformed preferred ID with a different integration's ID.
    const primaryId = config.analytics && config.analytics.measurementId;
    const ga4Id = primaryId == null || primaryId === ''
      ? config.integrations && config.integrations.analytics && config.integrations.analytics.measurementId
      : primaryId;
    const metaId = config.integrations && config.integrations.meta && config.integrations.meta.pixelId;
    if (ga4Id != null && ga4Id !== '' && (typeof ga4Id !== 'string' || !/^G-[A-Z0-9]+$/i.test(ga4Id))) return false;
    if (metaId != null && metaId !== '' && (typeof metaId !== 'string' || !/^\d{5,32}$/.test(metaId))) return false;
    const metadata = config.businessMeasurement;
    if (!exactRecord(metadata, ['version', 'expectedOrigin', 'providers']) || metadata.version !== 1 ||
        !exactRecord(metadata.providers, ['ga4', 'meta']) ||
        typeof metadata.providers.ga4 !== 'boolean' || typeof metadata.providers.meta !== 'boolean') return false;
    const expectedOrigin = 'https://' + domain;
    return metadata.expectedOrigin === expectedOrigin && window.location.origin === expectedOrigin &&
      window.location.protocol === 'https:';
  }

  let config;
  let runtimeEnabled = false;
  try {
    config = typeof CONFIG === 'undefined' ? null : CONFIG;
    runtimeEnabled = validIdentity(config);
  } catch (_) {
    // Malformed configuration cannot grant consent or open another site's channel.
  }
  let preference = null;
  let persistence = 'none';
  let epoch = 0;
  let reloadRequired = false;
  let reloadRequested = false;
  let channel = null;
  const seenClicks = new WeakSet();
  // Snapshot only approved fields: neither UI nor later CONFIG mutations select a provider.
  const primaryId = runtimeEnabled && config.analytics && config.analytics.measurementId;
  const ga4Id = runtimeEnabled && (primaryId ||
    (config.integrations && config.integrations.analytics && config.integrations.analytics.measurementId));
  const metaId = runtimeEnabled && config.integrations && config.integrations.meta && config.integrations.meta.pixelId;
  const expectedOrigin = runtimeEnabled && config.businessMeasurement.expectedOrigin;
  const providers = runtimeEnabled ? Object.freeze({
    ga4: config.businessMeasurement.providers.ga4, meta: config.businessMeasurement.providers.meta,
  }) : { ga4: false, meta: false };
  const configuredPhone = runtimeEnabled && config.distributor && config.distributor.whatsappNumber;
  const whatsappPhone = typeof configuredPhone === 'string' ? configuredPhone.replace(/\D/g, '') : '';
  const ga4 = { started: false, ready: false, failed: false, pageview: false, send: null };
  const meta = { started: false, ready: false, failed: false, pageview: false, send: null };

  function stateCopy() {
    return Object.freeze({
      policyVersion: POLICY_VERSION,
      analytics: preference ? preference.analytics : false,
      marketing: preference ? preference.marketing : false,
      expiresAt: null,
      persistence: persistence,
      runtimeEnabled: runtimeEnabled,
      reloadRequired: reloadRequired,
    });
  }

  function notify() {
    window.dispatchEvent(new window.CustomEvent(CHANGE_EVENT, { detail: stateCopy() }));
  }

  function requestCleanReload() {
    if (!reloadRequired || reloadRequested) return;
    reloadRequested = true;
    try { window.location.reload(); } catch (_) { /* Denied even if navigation is blocked. */ }
  }

  function broadcastWithdrawal() {
    try { if (channel) channel.postMessage({ version: 1, action: 'withdraw' }); } catch (_) {
      // Best-effort negative signal only; local denial never depends on the channel.
    }
  }

  function resetChoice() {
    preference = null;
    persistence = 'none';
    stopProviders();
    notify();
    requestCleanReload();
  }

  function safeContext() {
    // A clean custom payload cannot prevent SDK auto-collection of document URLs.
    // Only the canonical root with no referrer is eligible. Release flags additionally
    // require independently reviewed account/SDK controls (not provable by this asset).
    return runtimeEnabled && window.location.href === expectedOrigin + '/' && document.referrer === '';
  }

  function stopProviders() {
    // Invalidate first, including callbacks currently pending at the network boundary.
    epoch += 1;
    ga4.ready = false; meta.ready = false;
    if (ga4.started || meta.started) reloadRequired = true;
    if (reloadRequired) preference = { analytics: false, marketing: false };
    // Empty all owned queues before any SDK revocation can run callbacks.
    if (ga4.started && window.dataLayer) window.dataLayer.length = 0;
    if (meta.started && meta.send) meta.send.queue.length = 0;
    if (ga4.started) {
      window['ga-disable-' + ga4Id] = true;
      // ga-disable is the supported hard stop; do not send cookieless denial pings.
    }
    if (meta.started && meta.send) {
      try { meta.send('consent', 'revoke'); } catch (_) { /* Denial remains authoritative. */ }
    }
  }

  function permitted(provider, capturedEpoch) {
    if (capturedEpoch !== epoch || reloadRequired || !preference) return false;
    if (!safeContext()) {
      stopProviders(); notify(); requestCleanReload(); return false;
    }
    return provider === 'ga4' ? preference.analytics && providers.ga4 && !!ga4Id :
      preference.marketing && providers.meta && !!metaId;
  }

  function unowned(provider) {
    const globals = provider === 'ga4' ? ['gtag', 'dataLayer'] : ['fbq', '_fbq'];
    if (globals.some(function (name) { return name in window; })) return true;
    return Array.from(document.querySelectorAll('script[src]')).some(function (script) {
      try {
        const host = new URL(script.src, window.location.href).hostname;
        return provider === 'ga4' ? /(^|\.)(googletagmanager|google-analytics)\.com$/.test(host) :
          /(^|\.)(facebook\.net|facebook\.com)$/.test(host);
      } catch (_) { return true; }
    });
  }

  function loadProvider(provider, capturedEpoch) {
    const adapter = provider === 'ga4' ? ga4 : meta;
    if (adapter.started || adapter.failed || !permitted(provider, capturedEpoch)) return;
    if (unowned(provider)) { adapter.failed = true; return; }
    adapter.started = true;
    if (provider === 'ga4') {
      window.dataLayer = [];
      adapter.send = function () { window.dataLayer.push(arguments); };
      window.gtag = adapter.send;
      window['ga-disable-' + ga4Id] = false;
      adapter.send('consent', 'default', {
        analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      });
    } else {
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      fbq.queue = []; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0';
      adapter.send = fbq; window.fbq = fbq; window._fbq = fbq;
      fbq('consent', 'revoke');
      fbq('set', 'autoConfig', false, metaId);
    }
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = provider === 'ga4' ? 'https://www.googletagmanager.com/gtag/js?id=' + ga4Id :
      'https://connect.facebook.net/en_US/fbevents.js';
    script.onerror = function () {
      adapter.failed = true; adapter.ready = false;
      if (provider === 'ga4') {
        window['ga-disable-' + ga4Id] = true; window.dataLayer.length = 0;
      } else { adapter.send.queue.length = 0; }
    };
    script.onload = function () {
      if (adapter.failed || !permitted(provider, capturedEpoch)) return;
      try {
        if (provider === 'ga4') {
          adapter.send('js', new Date());
          adapter.send('config', ga4Id, {
            send_page_view: false, page_location: expectedOrigin + '/', page_referrer: '', page_title: 'Business',
            allow_google_signals: false, allow_ad_personalization_signals: false,
          });
          if (!adapter.pageview) adapter.send('event', 'page_view', {
            page_location: expectedOrigin + '/', page_referrer: '', page_title: 'Business',
          });
        } else {
          adapter.send('init', metaId);
          adapter.send('consent', 'grant');
          if (!adapter.pageview) adapter.send('track', 'PageView');
        }
        adapter.pageview = true; adapter.ready = true;
      } catch (_) { script.onerror(); }
    };
    try { document.head.appendChild(script); } catch (_) { script.onerror(); }
  }

  function syncProviders(capturedEpoch) {
    loadProvider('ga4', capturedEpoch);
    loadProvider('meta', capturedEpoch);
  }

  function trackWhatsappClick(event) {
    if (event.isTrusted !== true || seenClicks.has(event)) return;
    seenClicks.add(event);
    const target = event.target && (event.target.nodeType === 3 ? event.target.parentElement : event.target);
    const anchor = target && typeof target.closest === 'function' ? target.closest('a') : null;
    if (!anchor || !/^\d{8,15}$/.test(whatsappPhone)) return;
    let placement;
    switch (anchor.id) {
      case 'btnNavContact': placement = 'header'; break;
      case 'main-vsl-cta': placement = 'hero_primary'; break;
      case 'secondary-vsl-cta': placement = 'hero_secondary'; break;
      case 'btnRegisterFinal': placement = 'final_primary'; break;
      case 'btnContactNegocioWa': placement = 'final_secondary'; break;
      default:
        if (!anchor.id && anchor.classList.contains('bind-cta-primary') && anchor.closest('header')) placement = 'header';
    }
    if (!placement) return;
    try {
      const destination = new URL(anchor.href);
      if (destination.protocol !== 'https:' || destination.username || destination.password || destination.port) return;
      if (!(destination.hostname === 'wa.me' && destination.pathname === '/' + whatsappPhone) &&
          !(destination.hostname === 'api.whatsapp.com' && destination.pathname === '/send' &&
            destination.searchParams.getAll('phone').length === 1 && destination.searchParams.get('phone') === whatsappPhone)) return;
    } catch (_) { return; }
    // Never enqueue clicks: only live, ready adapters may emit this native event.
    const payload = { placement: placement, destination: 'whatsapp' };
    try { if (ga4.ready && permitted('ga4', epoch)) ga4.send('event', 'click_cta', payload); } catch (_) { /* Navigation is independent. */ }
    try { if (meta.ready && permitted('meta', epoch)) meta.send('trackCustom', 'WhatsAppClick', payload); } catch (_) { /* Navigation is independent. */ }
  }

  function setConsent(choice) {
    if (!exactRecord(choice, ['analytics', 'marketing']) ||
        typeof choice.analytics !== 'boolean' || typeof choice.marketing !== 'boolean') {
      throw new TypeError('Consent requires exactly analytics and marketing booleans');
    }
    if (!runtimeEnabled) return stateCopy();
    if (reloadRequired) {
      // Quarantine blocks grants, not an explicit withdrawal to reachable peers.
      if (!choice.analytics && !choice.marketing) broadcastWithdrawal();
      return stateCopy();
    }
    const reduced = preference && ((preference.analytics && !choice.analytics) || (preference.marketing && !choice.marketing));
    preference = {
      analytics: choice.analytics,
      marketing: choice.marketing,
    };
    // Compatibility label: session means this document's memory, NOT sessionStorage.
    persistence = 'session';
    if (reduced) stopProviders();
    if (reduced || (!choice.analytics && !choice.marketing)) broadcastWithdrawal();
    syncProviders(epoch);
    notify();
    requestCleanReload();
    return stateCopy();
  }

  Object.defineProperty(window, 'PartnerHubBusinessConsent', {
    value: Object.freeze({
      getState: stateCopy,
      setConsent: setConsent,
      withdraw: function () { return setConsent({ analytics: false, marketing: false }); },
    }),
    writable: false,
    configurable: false,
    enumerable: true,
  });
  if (runtimeEnabled) {
    document.addEventListener('click', trackWhatsappClick);
    try {
      if (typeof window.BroadcastChannel === 'function') {
        channel = new window.BroadcastChannel('ph:business-consent:v1:' + config.site.id);
        channel.onmessage = function (event) {
          const data = event.data;
          if (exactRecord(data, ['version', 'action']) && data.version === 1 && data.action === 'withdraw') {
            resetChoice(); // Never echo received messages or import positive permissions.
          }
        };
      }
    } catch (_) { channel = null; }
    function checkContext() {
      if ((ga4.started || meta.started) && !reloadRequired && !safeContext()) {
        stopProviders(); notify(); requestCleanReload();
      }
    }
    window.addEventListener('hashchange', checkContext);
    window.addEventListener('popstate', checkContext);
    window.addEventListener('pageshow', function (event) {
      if (event.persisted === true) resetChoice();
      else checkContext();
    });
    document.addEventListener('visibilitychange', checkContext);
  }
}());
