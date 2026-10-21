import assert from 'node:assert/strict';
import test from 'node:test';
import {
  openConsentFixture,
  reviewedArtifact,
  state,
  choose,
  sdkEvents,
  assertNoTracking
} from './business-consent-browser-harness.mjs';

// These catch actual package/runtime behavior, never a reconstructed runtime.
test('release registry blocks providers even after visible acceptance', async (t) => {
  const f = await openConsentFixture(t, {
    providers: reviewedArtifact.providers
  });
  await f.page.locator('#business-consent-accept').click({ noWaitAfter: true });
  assert.equal((await state(f.page)).analytics, true);
  await assertNoTracking(f);
});

for (const mode of ['no-choice', 'reject', 'no-js'])
  test(`${mode}: zero tracking scripts/images/beacons/iframes`, async (t) => {
    const f = await openConsentFixture(t, {
      javaScriptEnabled: mode !== 'no-js'
    });
    if (mode === 'reject')
      await f.page.locator('#business-consent-reject').click();
    await assertNoTracking(f);
    assert.equal(await f.page.locator('#main-vsl-cta').count(), 1);
  });

for (const category of ['analytics', 'marketing'])
  test(`TEST FIXTURE ONLY: ${category} selective consent loads only its provider`, async (t) => {
    const f = await openConsentFixture(t);
    await choose(f.page, category === 'analytics', category === 'marketing');
    await f.page.waitForFunction(() => window.__sdkLog.length > 0);
    assert.deepEqual(
      [...new Set(f.requests.filter((r) => r.sdk).map((r) => r.sdk))],
      [category === 'analytics' ? 'ga4' : 'meta']
    );
    const events = await sdkEvents(f.page);
    assert.equal(
      events.filter((e) =>
        e.args.includes(category === 'analytics' ? 'page_view' : 'PageView')
      ).length,
      1
    );
  });

test('TEST FIXTURE ONLY: repeated accept/double init, trusted nested and keyboard clicks, no replay or PII', async (t) => {
  const f = await openConsentFixture(t);
  await f.page.locator('#main-vsl-cta').click(); // Pre-consent intention cannot replay.
  await f.page.locator('#business-consent-accept').click({ noWaitAfter: true });
  await f.page.waitForFunction(() =>
    window.__sdkLog.some((e) => e.args.includes('PageView'))
  );
  await f.page.evaluate(() =>
    window.PartnerHubBusinessConsent.setConsent({
      analytics: true,
      marketing: true
    })
  );
  await f.page.addScriptTag({ url: `${f.origin}/measurement-runtime.js` });
  assert.equal(f.requests.filter((r) => r.sdk === 'ga4').length, 1);
  assert.equal(f.requests.filter((r) => r.sdk === 'meta').length, 1);
  assert.equal(
    (await sdkEvents(f.page)).filter((e) => e.args.includes('click_cta'))
      .length,
    0
  );
  await f.page.locator('#main-vsl-cta').click();
  await f.page.locator('#main-vsl-cta span').first().click();
  await f.page.locator('#main-vsl-cta').focus();
  await f.page.keyboard.press('Enter');
  // Synthetic clicks are not trusted; they must not count.
  await f.page
    .locator('#main-vsl-cta')
    .evaluate((a) =>
      a.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    );
  const events = await sdkEvents(f.page);
  for (const name of ['click_cta', 'WhatsAppClick']) {
    const clicks = events.filter((e) => e.args.includes(name));
    assert.equal(clicks.length, 3);
    for (const click of clicks)
      assert.deepEqual(click.args.at(-1), {
        placement: 'hero_primary',
        destination: 'whatsapp'
      });
  }
  assert.equal(events.filter((e) => e.args.includes('page_view')).length, 1);
  assert.equal(events.filter((e) => e.args.includes('PageView')).length, 1);
  assert.doesNotMatch(
    JSON.stringify(events),
    /573100000001|ana-seed|Ana Seed|owner-seed|SEED MESSAGE|wa\.me|@example/
  );
  assert.ok((await f.page.evaluate(() => window.__intentions)).length >= 4);
});

for (const storageFailure of [false, true])
  test(`new document/reload ignores legacy grants; storage failure=${storageFailure}`, async (t) => {
    const f = await openConsentFixture(t, {
      storageFailure,
      providers: { ga4: false, meta: false }
    });
    assert.equal((await state(f.page)).analytics, false);
    await f.page
      .locator('#business-consent-accept')
      .click({ noWaitAfter: true });
    await f.page.evaluate(() => {
      window.__storageFailure = false;
    });
    await f.page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal((await state(f.page)).analytics, false);
    assert.equal((await state(f.page)).persistence, 'none');
    assert.deepEqual(await f.page.evaluate(() => window.__storageAccess), []);
    await assertNoTracking(f);
  });

for (const timing of ['before', 'during', 'onload', 'after'])
  test(`withdraw ${timing} SDK: no late events, UI quarantine cannot regrant`, async (t) => {
    const f = await openConsentFixture(t, {
      sdkMode:
        timing === 'during'
          ? 'delayed'
          : timing === 'onload'
            ? 'withdraw-onload'
            : 'normal',
      holdReload: true
    });
    if (timing === 'before') {
      await f.page.locator('#business-consent-configure').click();
      await f.page
        .locator('#business-consent-withdraw')
        .click({ noWaitAfter: true });
      await assertNoTracking(f);
      return;
    }
    await f.page
      .locator('#business-consent-accept')
      .click({ noWaitAfter: true });
    if (timing === 'during')
      await f.page.waitForFunction(() => !!window.gtag && !!window.fbq);
    if (timing === 'after')
      await f.page.waitForFunction(() =>
        window.__sdkLog.some((e) => e.args.includes('PageView'))
      );
    if (timing !== 'onload') {
      await f.page.locator('#business-consent-reopen').click();
      await f.page
        .locator('#business-consent-withdraw')
        .click({ noWaitAfter: true });
    }
    await f.releaseSDKs();
    await f.page.waitForFunction(
      () => window.PartnerHubBusinessConsent.getState().reloadRequired
    );
    const before = (await sdkEvents(f.page)).filter((e) =>
      ['page_view', 'PageView', 'click_cta', 'WhatsAppClick'].some((n) =>
        e.args.includes(n)
      )
    );
    if (timing !== 'after') assert.equal(before.length, 0);
    await f.page.evaluate(() =>
      window.PartnerHubBusinessConsent.setConsent({
        analytics: true,
        marketing: true
      })
    );
    assert.equal((await state(f.page)).analytics, false);
    assert.equal(
      await f.page.locator('#business-consent-accept').isDisabled(),
      true
    );
    assert.deepEqual(
      (await sdkEvents(f.page)).filter((e) =>
        ['page_view', 'PageView', 'click_cta', 'WhatsAppClick'].some((n) =>
          e.args.includes(n)
        )
      ),
      before
    );
  });

test('persisted pageshow invalidates an open draft; real two-tab BroadcastChannel revoke has no echo/regrant', async (t) => {
  const f = await openConsentFixture(t, { holdReload: true });
  const peer = await f.newPage();
  await choose(f.page, true, true);
  assert.equal(
    (await state(peer)).analytics,
    false,
    'positive consent is never shared with the second tab'
  );
  await choose(peer, true, true);
  await peer.waitForFunction(() =>
    window.__sdkLog.some((e) => e.args.includes('PageView'))
  );
  await f.page.locator('#business-consent-reopen').click();
  await f.page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true })
    )
  );
  assert.equal(
    await f.page.locator('#business-consent-analytics').isChecked(),
    false
  );
  assert.equal(
    (await state(peer)).analytics,
    true,
    'BFCache reset is not a positive/negative broadcast'
  );
  // Explicit withdrawal must still reach the peer while its first native reload is dismissed at the browser boundary.
  await f.page
    .locator('#business-consent-withdraw')
    .click({ noWaitAfter: true });
  await peer.waitForFunction(
    () => window.PartnerHubBusinessConsent.getState().reloadRequired
  );
  assert.equal((await state(peer)).analytics, false);
  assert.deepEqual(await peer.evaluate(() => window.__channelPosts), []);
  assert.deepEqual(await f.page.evaluate(() => window.__channelPosts), [
    { version: 1, action: 'withdraw' }
  ]);
  await peer.evaluate(() =>
    window.PartnerHubBusinessConsent.setConsent({
      analytics: true,
      marketing: true
    })
  );
  assert.equal((await state(peer)).analytics, false);
  t.diagnostic(
    'pageshow.persisted is browser-event simulation, not proof of native BFCache restoration; peer tabs/channel are native.'
  );
});

const blockedCases = [
  [
    'preview',
    {
      url: 'https://app.partnerhub.club/api/internal/product-pages/preview/ana-business/index.html'
    }
  ],
  ['wrong-origin', { url: 'https://foreign.fixture.test/' }],
  [
    'wrong-partner',
    {
      configPatch: {
        site: { id: 'bob-business', domain: 'other.fixture.test' }
      }
    }
  ],
  [
    'master',
    {
      configPatch: {
        site: { id: 'ganomaster-business', domain: 'negocio.fixture.test' }
      }
    }
  ],
  ['malformed-id', { configPatch: { analytics: { measurementId: 'G-BAD?' } } }],
  [
    'empty-ids',
    { configPatch: { analytics: { measurementId: '' }, integrations: {} } }
  ],
  [
    'query',
    { url: 'https://negocio.fixture.test/?utm_source=ana-seed@example.test' }
  ],
  ['hash', { url: 'https://negocio.fixture.test/#ana-seed' }],
  ['referrer', { referer: 'https://referrer.fixture.test/ana-seed' }]
];
for (const [name, options] of blockedCases)
  test(`${name}: no SDK, not measurement-ready`, async (t) => {
    const f = await openConsentFixture(t, options);
    if (!(await f.page.locator('#business-consent-accept').isDisabled()))
      await f.page.locator('#business-consent-accept').click();
    await assertNoTracking(f);
  });

test('changing context while SDK pending blocks late onload events', async (t) => {
  const f = await openConsentFixture(t, {
    sdkMode: 'delayed',
    holdReload: true
  });
  await f.page.locator('#business-consent-accept').click();
  await f.page.evaluate(() => {
    location.hash = 'ana-seed';
  });
  await f.page.waitForFunction(
    () => window.PartnerHubBusinessConsent.getState().reloadRequired
  );
  await f.releaseSDKs();
  assert.equal(
    (await sdkEvents(f.page)).filter(
      (e) => e.args.includes('PageView') || e.args.includes('page_view')
    ).length,
    0
  );
});

test('failed SDK leaves video/contact/navigation usable without events', async (t) => {
  const f = await openConsentFixture(t, { sdkMode: 'fail' });
  await f.page.locator('#business-consent-accept').click();
  await f.page.locator('#main-vsl-cta').click();
  assert.match(
    await f.page.locator('#main-vsl-cta').getAttribute('href'),
    /https:\/\/wa.me\/573100000001/
  );
  await f.page.locator('#vsl-play-btn').click();
  assert.ok(await f.page.locator('video').count());
  assert.ok((await f.page.evaluate(() => window.__intentions)).length);
  assert.equal((await sdkEvents(f.page)).length, 0);
});

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }]
])
  test(`integrated UI ${name}: focus/Escape/cancel/withdraw, equal salience, narrow overflow`, async (t) => {
    const f = await openConsentFixture(t, {
      viewport,
      providers: reviewedArtifact.providers
    });
    const p = f.page;
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    );
    const styles = await p
      .locator('.business-consent-actions button')
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const s = getComputedStyle(n);
          return [s.backgroundColor, s.color, s.borderColor, s.fontWeight];
        })
      );
    assert.deepEqual(styles[0], styles[1]);
    assert.deepEqual(styles[1], styles[2]);
    await f.capture(`${name}-initial`);
    await p.locator('#business-consent-configure').click();
    assert.equal(
      await p
        .locator('#business-consent-analytics')
        .evaluate((n) => n === document.activeElement),
      true
    );
    await p.keyboard.press('Shift+Tab');
    assert.equal(
      await p
        .locator('#business-consent-withdraw')
        .evaluate((n) => n === document.activeElement),
      true
    );
    await p.keyboard.press('Tab');
    assert.equal(
      await p
        .locator('#business-consent-analytics')
        .evaluate((n) => n === document.activeElement),
      true
    );
    await p.locator('#business-consent-analytics').check();
    await f.capture(`${name}-preferences`);
    await p.keyboard.press('Escape');
    assert.equal((await state(p)).analytics, false);
    assert.equal(
      await p
        .locator('#business-consent-configure')
        .evaluate((n) => n === document.activeElement),
      true
    );
    await p.locator('#business-consent-configure').click();
    assert.equal(
      await p.locator('#business-consent-analytics').isChecked(),
      false
    );
    await p.locator('#business-consent-cancel').click();
    await p.locator('#business-consent-accept').click();
    await p.locator('#business-consent-reopen').click();
    await p.locator('#business-consent-withdraw').click();
    assert.equal((await state(p)).analytics, false);
    await p.locator('#business-consent-cancel').click();
    await p.setViewportSize({ width: 320, height: 844 });
    await p.evaluate(() => {
      document.documentElement.style.zoom = '1.25';
    });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    );
    await f.capture(`${name}-narrow-zoom`);
    await assertNoTracking(f);
  });

for (const runtimeMode of ['missing', 'error', 'late'])
  test(`runtime ${runtimeMode}: no apparent regrant, content/contact remain`, async (t) => {
    const f = await openConsentFixture(t, {
      runtimeMode,
      providers: reviewedArtifact.providers
    });
    assert.equal(
      await f.page.locator('#business-consent-accept').isDisabled(),
      true
    );
    await f.page.locator('#business-consent-configure').click();
    assert.equal(
      await f.page.locator('#business-consent-save').isDisabled(),
      true
    );
    await f.page.locator('#business-consent-cancel').click();
    if (runtimeMode === 'late') {
      await f.page.addScriptTag({
        url: `${f.origin}/measurement-runtime.js?late=1`
      });
      await f.page.locator('#business-consent-configure').click();
      assert.equal(
        await f.page.locator('#business-consent-analytics').isChecked(),
        false
      );
      assert.equal(
        await f.page.locator('#business-consent-save').isDisabled(),
        false
      );
      await f.page.locator('#business-consent-cancel').click();
    }
    await f.page.locator('#main-vsl-cta').click();
    await assertNoTracking(f);
  });
