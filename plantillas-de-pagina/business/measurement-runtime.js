/* Business consent authority. Classic asset: config.js -> this file -> app.js. */
(function () {
  'use strict';

  if (Object.prototype.hasOwnProperty.call(window, 'PartnerHubBusinessConsent')) return;

  const POLICY_VERSION = '2026-10-21';
  const TTL = 180 * 24 * 60 * 60 * 1000;
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
    // Malformed configuration cannot grant consent or touch another site's storage.
  }
  const storageKey = runtimeEnabled ? 'ph:business-consent:v1:' + config.site.id : null;
  let preference = null;
  let persistence = 'none';

  function validPreference(value) {
    const now = Date.now();
    return exactRecord(value, ['policyVersion', 'analytics', 'marketing', 'expiresAt']) &&
      value.policyVersion === POLICY_VERSION && typeof value.analytics === 'boolean' &&
      typeof value.marketing === 'boolean' && Number.isSafeInteger(value.expiresAt) &&
      Number.isSafeInteger(now) && value.expiresAt > now && value.expiresAt <= now + TTL;
  }

  function stateCopy() {
    return Object.freeze({
      policyVersion: POLICY_VERSION,
      analytics: preference ? preference.analytics : false,
      marketing: preference ? preference.marketing : false,
      expiresAt: preference ? preference.expiresAt : null,
      persistence: persistence,
      runtimeEnabled: runtimeEnabled,
      reloadRequired: false,
    });
  }

  function notify() {
    window.dispatchEvent(new window.CustomEvent(CHANGE_EVENT, { detail: stateCopy() }));
  }

  function expirePreference() {
    if (preference && !validPreference(preference)) {
      preference = null;
      persistence = 'none';
      notify();
    }
  }

  if (runtimeEnabled) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey));
      if (validPreference(stored)) {
        preference = stored;
        persistence = 'local';
      }
    } catch (_) {
      // Unavailable/corrupt storage starts denied. Explicit choices may be session-only.
    }
  }

  function setConsent(choice) {
    if (!exactRecord(choice, ['analytics', 'marketing']) ||
        typeof choice.analytics !== 'boolean' || typeof choice.marketing !== 'boolean') {
      throw new TypeError('Consent requires exactly analytics and marketing booleans');
    }
    if (!runtimeEnabled) return stateCopy();
    const now = Date.now();
    if (!Number.isSafeInteger(now) || !Number.isSafeInteger(now + TTL)) return stateCopy();
    preference = {
      policyVersion: POLICY_VERSION,
      analytics: choice.analytics,
      marketing: choice.marketing,
      expiresAt: now + TTL,
    };
    persistence = 'session';
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preference));
      persistence = 'local';
    } catch (_) {
      // A failed replacement must not leave a readable older grant when removal
      // still works (e.g. quota-limited storage). Never remove another site's key.
      try { window.localStorage.removeItem(storageKey); } catch (_) {
        // Both mutations failed: denial is only in memory, not durably guaranteed.
      }
    }
    notify();
    return stateCopy();
  }

  Object.defineProperty(window, 'PartnerHubBusinessConsent', {
    value: Object.freeze({
      getState: function () { expirePreference(); return stateCopy(); },
      setConsent: setConsent,
      withdraw: function () { return setConsent({ analytics: false, marketing: false }); },
    }),
    writable: false,
    configurable: false,
    enumerable: true,
  });
}());
