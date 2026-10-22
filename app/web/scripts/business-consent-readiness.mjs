import {
  directorySnapshot,
  hash,
  loadMeasurementBackend,
  openConsentFixture
} from './business-consent-browser-harness.mjs';
import { isDeepStrictEqual } from 'node:util';

/** Local evidence only. This API cannot enable a registry/provider or fetch a public site. */
export async function runBusinessConsentReadiness({
  packageDirectory,
  artifact,
  fixtureOrigin
}) {
  const url = new URL(fixtureOrigin);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.fixture.test') ||
    url.origin !== fixtureOrigin
  )
    throw new Error('FIXTURE_ORIGIN_REQUIRED');
  const packageSha256 = hash(
    JSON.stringify(await directorySnapshot(packageDirectory))
  );
  const checks = [];
  const providers = { ga4: 'BLOCKED', meta: 'BLOCKED' };
  const backend = await loadMeasurementBackend();
  const approved = backend.APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS.find(
    (value) => isDeepStrictEqual(value, artifact)
  );
  checks.push({
    name: 'release-policy',
    status: approved ? 'PASS' : 'FAIL',
    evidence: approved
      ? 'Exact reviewed release approval; both provider flags remain false.'
      : 'Caller artifact is not the reviewed registry entry; caller flags cannot promote readiness.'
  });
  let bound = false;
  try {
    const prepared =
      await backend.businessMeasurementPreparer.prepare(packageDirectory);
    bound = true;
    checks.push({
      name: 'asset-binding',
      status: 'PASS',
      evidence: `Actual server preparer accepted exact executable assets; provider flags ${JSON.stringify(prepared.providers)}.`
    });
  } catch (error) {
    checks.push({
      name: 'asset-binding',
      status: 'FAIL',
      evidence: error.message
    });
  }
  if (bound && approved) {
    const cleanup = [];
    try {
      const f = await openConsentFixture(
        { after: (fn) => cleanup.push(fn), diagnostic() {} },
        { packageDirectory, url: `${fixtureOrigin}/` }
      );
      await f.page.waitForTimeout(80);
      const attempted = f.requests.filter((r) => r.tracking);
      checks.push({
        name: 'offline-initial-network',
        status: attempted.length ? 'FAIL' : 'PASS',
        evidence: `Actual package in isolated Chrome, deny-by-default routes; ${attempted.length} tracking attempts. No fake flags promoted.`
      });
    } catch (error) {
      checks.push({
        name: 'offline-initial-network',
        status: error.message.startsWith('BLOCKED:') ? 'BLOCKED' : 'FAIL',
        evidence: error.message
      });
    } finally {
      for (const fn of cleanup.reverse()) await fn();
    }
  }
  for (const name of ['ga4', 'meta'])
    checks.push({
      name: `${name}-activation`,
      status: 'BLOCKED',
      evidence:
        'Offline adapter tests do not prove real SDK automatic collection, account privacy settings, paid context safety, or external receipt. Registry flag stays false.'
    });
  checks.push({
    name: 'public-verification',
    status: 'BLOCKED',
    evidence:
      'NOT_RUN: no publication, public fetch, real provider/account/event, DNS or SFTP authorized.'
  });
  return { packageSha256, checks, providers, publicVerification: 'NOT_RUN' };
}
