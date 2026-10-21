import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  lstat
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

export const repositoryRoot = resolve(
  fileURLToPath(new URL('../../..', import.meta.url))
);
export const reviewedArtifact = Object.freeze({
  version: 1,
  indexHtmlSha256:
    '39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb',
  appJsSha256:
    'a8844b5d9daf89083adb55293bc16e7f558ccf9afd87aaa0f2926ad17375313b',
  runtimeSha256:
    '497d0f954435101910ae6dee049feca65b44bd3050cb3e14b9c5640e70c07706',
  stylesSha256:
    '302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59',
  providers: Object.freeze({ ga4: false, meta: false })
});
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assetFields = {
  'index.html': 'indexHtmlSha256',
  'app.js': 'appJsSha256',
  'measurement-runtime.js': 'runtimeSha256',
  'styles.css': 'stylesSha256'
};

export async function directorySnapshot(directory) {
  const result = [];
  async function visit(path, prefix = '') {
    for (const name of (await readdir(path)).sort()) {
      const target = resolve(path, name);
      const stat = await lstat(target);
      if (stat.isSymbolicLink()) throw new Error('PACKAGE_SYMLINK_REJECTED');
      if (stat.isDirectory()) {
        result.push([`${prefix}${name}/`, 'directory']);
        await visit(target, `${prefix}${name}/`);
      } else if (stat.isFile())
        result.push([`${prefix}${name}`, hash(await readFile(target))]);
      else throw new Error('PACKAGE_NONREGULAR_REJECTED');
    }
  }
  await visit(directory);
  return result;
}

export async function materializeReviewedTemplate(t) {
  const directory = await mkdtemp(resolve(tmpdir(), 'ph-consent-reviewed-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of [
    'index.html',
    'app.js',
    'measurement-runtime.js',
    'styles.css',
    'config.js',
    'favicon.svg'
  ]) {
    // Buffer is deliberate: core.autocrlf checkout bytes are NOT release approval.
    const bytes = execFileSync(
      'git',
      ['show', `HEAD:plantillas-de-pagina/business/${name}`],
      { cwd: repositoryRoot, maxBuffer: 4 * 1024 * 1024 }
    );
    if (assetFields[name])
      assert.equal(
        hash(bytes),
        reviewedArtifact[assetFields[name]],
        `committed reviewed ${name} drift`
      );
    await writeFile(resolve(directory, name), bytes);
  }
  await mkdir(resolve(directory, 'tipografia'));
  return { directory };
}

let backend;
export async function loadMeasurementBackend() {
  if (!backend)
    backend = (async () => {
      const require = createRequire(
        new URL('../package.json', import.meta.url)
      );
      const { build } = require('esbuild');
      const result = await build({
        stdin: {
          contents:
            "export * from './server/services/businessMeasurementHtml.ts'; export * from './server/services/businessMeasurementArtifacts.ts';",
          resolveDir: resolve(repositoryRoot, 'app/web'),
          sourcefile: 'consent-integration-entry.mjs'
        },
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'node',
        target: 'node20',
        plugins: [
          {
            name: 'existing-test-aliases',
            setup(b) {
              b.onResolve({ filter: /^server-only$/ }, () => ({
                path: 'server-only',
                namespace: 'test-empty'
              }));
              b.onLoad({ filter: /.*/, namespace: 'test-empty' }, () => ({
                contents: 'export default {};'
              }));
              b.onResolve({ filter: /^@\// }, (args) => ({
                path: resolve(
                  repositoryRoot,
                  'app/web',
                  args.path.slice(2) + '.ts'
                )
              }));
            }
          }
        ]
      });
      return import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
      );
    })();
  return backend;
}

// Execute the real TypeScript generator in a disposable process. Node20 owns the
// CLI rehearsal; the installed Node24 TS loader owns service integration only.
export async function generateReviewedPackage(t, { fixtureProviders } = {}) {
  const master = await materializeReviewedTemplate(t);
  const root = await mkdtemp(resolve(tmpdir(), 'ph-consent-generated-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = `
    import assert from 'node:assert/strict';
    import { cp,mkdir,readFile,writeFile } from 'node:fs/promises';
    import { resolve } from 'node:path';
    import { runInNewContext } from 'node:vm';
    import { productPageGenerationService as generator,productPageGenerationInputSchema as schema } from './server/services/productPageGenerationService.ts';
    import { businessMeasurementPreparer,createBusinessMeasurementPreparer } from './server/services/businessMeasurementHtml.ts';
    import { productPageSourceService } from './server/services/productPageSourceService.ts';
    import { masterSitesBusinessPreviewService as authority } from './server/services/masterSitesBusinessPreviewService.ts';
    import { partnerEcosystemEntitlementService } from './server/services/partnerEcosystemEntitlementService.ts';
    import { activationLeadService } from './server/services/activationLeadService.ts';
    import { productPageHistoryService } from './server/services/productPageHistoryService.ts';
    import { businessProductHeroCorrelationService } from './server/services/businessProductHeroCorrelationService.ts';
    import { publicationEventEnqueueService } from './server/services/publicationEventEnqueueService.ts';
    import { businessProductHeroPropagationService } from './server/services/businessProductHeroPropagationService.ts';
    import { POST } from './app/api/internal/product-pages/generate/route.ts';
    import { directorySnapshot } from './scripts/business-consent-browser-harness.mjs';
    const root=${JSON.stringify(root)};
    process.env.PRODUCT_PAGE_OUTPUT_DIR=root;process.env.PRODUCT_PAGE_SOURCE_DIR=resolve(root,'.sources');
    await mkdir(process.env.PRODUCT_PAGE_SOURCE_DIR);
    const master=resolve(root,'ganomaster-business');await cp(${JSON.stringify(master.directory)},master,{recursive:true});
    const fixtureProviders=${JSON.stringify(fixtureProviders || null)};
    if(fixtureProviders) businessMeasurementPreparer.prepare=createBusinessMeasurementPreparer({approvedArtifacts:[{...${JSON.stringify(reviewedArtifact)},providers:fixtureProviders}]}).prepare;
    const owner='11111111-1111-4111-8111-111111111111';
    const input=schema.parse({ecosystemType:'BUSINESS',site:{id:'ana-business',domain:'negocio.fixture.test',title:'Offline Business',metaDescription:'Offline consent integration'},distributor:{brandName:'Ana Seed',firstName:'Ana',fullName:'Ana Seed',whatsappNumber:'573100000001',defaultMessage:'SEED MESSAGE ana-seed@example.test'},hero:{},analytics:{measurementId:'G-OFFLINEFIXTURE'},integrations:{analytics:{provider:'GA4',measurementId:'G-OFFLINEFIXTURE'},meta:{pixelId:'1234500000'}}});
    const snapshot={activationLeadId:owner,ownerKey:owner,siteId:'ana-business',publicHost:'negocio.fixture.test',lead:{id:owner},partner:{activationLeadId:owner,siteId:'ana-business',publicHost:'negocio.fixture.test',status:'READY'},entitlement:{activationLeadId:owner,commercialState:'KNOWN',includedEcosystems:['BUSINESS']},input};
    authority.getMeasurementAuthoritySnapshot=async()=>snapshot;
    partnerEcosystemEntitlementService.get=async()=>({activationLeadId:owner,includedEcosystems:['BUSINESS','PRODUCT','PERSONAL_BRAND']});
    activationLeadService.updatePublicationStateBySiteId=async()=>null;
    let history=0,effects=0;productPageHistoryService.append=async()=>{history++;};
    businessProductHeroCorrelationService.resolveForBusinessSite=async()=>({});
    publicationEventEnqueueService.afterSourceChange=async()=>{effects++;return{outcome:'SKIPPED'};};
    businessProductHeroPropagationService.afterProductSourceChange=async()=>{effects++;};
    const forged={version:1,expectedOrigin:'https://forged.fixture.test',providers:{ga4:true,meta:true}};
    const masterConfig=JSON.parse(runInNewContext((await readFile(resolve(master,'config.js'),'utf8'))+';JSON.stringify(CONFIG)'));
    masterConfig.businessMeasurement=forged;await writeFile(resolve(master,'config.js'),'const CONFIG='+JSON.stringify(masterConfig)+';if(typeof window!=="undefined")window.CONFIG=CONFIG;');
    await productPageSourceService.save('ana-business',{...input,businessMeasurement:forged});
    const response=await POST(new Request('https://app.partnerhub.club/api/internal/product-pages/generate',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.fixture.test'},body:JSON.stringify({...input,businessMeasurement:forged})}));
    assert.equal(response.status,201,JSON.stringify(await response.json()));
    const directory=resolve(root,'ana-business');
    const config=()=>readFile(resolve(directory,'config.js'),'utf8').then(text=>JSON.parse(runInNewContext(text+';JSON.stringify(CONFIG)')));
    assert.deepEqual((await config()).businessMeasurement,{version:1,expectedOrigin:'https://negocio.fixture.test',providers:fixtureProviders||{ga4:false,meta:false}});
    for(let i=0;i<2;i++){
      if(i)await generator.regenerateFromSavedSource('ana-business');
      await businessMeasurementPreparer.prepare(directory);
      for(const name of ['app.js','measurement-runtime.js','styles.css'])assert.deepEqual(await readFile(resolve(directory,name)),await readFile(resolve(master,name)));
    }
    const packageBefore=await directorySnapshot(directory);const sourcePath=resolve(process.env.PRODUCT_PAGE_SOURCE_DIR,'ana-business.json');const sourceBefore=await readFile(sourcePath);
    const sourcesBefore=await directorySnapshot(process.env.PRODUCT_PAGE_SOURCE_DIR);
    const historyBefore=history,effectsBefore=effects;
    const runtime=await readFile(resolve(master,'measurement-runtime.js'));await writeFile(resolve(master,'measurement-runtime.js'),Buffer.concat([runtime,Buffer.from(' ')]));
    await assert.rejects(generator.generate(input),/BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED/);
    assert.deepEqual(await directorySnapshot(directory),packageBefore);assert.deepEqual(await directorySnapshot(process.env.PRODUCT_PAGE_SOURCE_DIR),sourcesBefore);assert.deepEqual(await readFile(sourcePath),sourceBefore);assert.equal(history,historyBefore);assert.equal(effects,effectsBefore);
    await writeFile(resolve(master,'measurement-runtime.js'),runtime);
    process.stdout.write(JSON.stringify({directory,root,history,effects,forgedMetadataRejected:true,unreviewedRejectedBeforeMutation:true,generations:2}));
  `;
  const result = execFileSync(
    'node',
    [
      '--conditions=react-server',
      '--experimental-strip-types',
      '--experimental-loader',
      './scripts/node-test-alias-loader.mjs',
      '--input-type=module',
      '-e',
      script
    ],
    {
      cwd: resolve(repositoryRoot, 'app/web'),
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  return JSON.parse(result);
}

export const state = (page) =>
  page.evaluate(() => window.PartnerHubBusinessConsent.getState());
export const sdkEvents = (page) => page.evaluate(() => window.__sdkLog);
export async function choose(page, analytics, marketing) {
  await page.locator('#business-consent-configure').click();
  await page.locator('#business-consent-analytics').setChecked(analytics);
  await page.locator('#business-consent-marketing').setChecked(marketing);
  await page.locator('#business-consent-save').click();
}
export async function assertNoTracking(f) {
  await f.page.waitForTimeout(80);
  assert.deepEqual(
    f.requests.filter((r) => r.tracking),
    [],
    'no tracking attempt may cross the intercepted boundary'
  );
  if (f.javaScriptEnabled) assert.deepEqual(await sdkEvents(f.page), []);
  assert.equal(
    await f.page
      .locator(
        'iframe[src*="facebook"],img[src*="facebook"],iframe[src*="google-analytics"],img[src*="google-analytics"]'
      )
      .count(),
    0
  );
}

const fakeSDK = (provider) => `(() => {
  const record = args => window.__sdkLog.push({provider:${JSON.stringify(provider)},args:Array.from(args)});
  ${provider === 'ga4' ? 'const q=window.dataLayer; q.forEach(record); q.push=function(...items){items.forEach(record);return Array.prototype.push.apply(this,items);};' : 'const q=window.fbq.queue.slice();window.fbq.queue.length=0;window.fbq.callMethod=function(){record(arguments);};q.forEach(record);'}
})();`;

export async function openConsentFixture(t, options = {}) {
  const {
    providers = { ga4: true, meta: true },
    javaScriptEnabled = true,
    sdkMode = 'normal',
    runtimeMode = 'normal',
    holdReload = false
  } = options;
  let playwright;
  try {
    if (!process.env.PARTNERHUB_TEST_NODE_MODULES)
      throw new Error('PARTNERHUB_TEST_NODE_MODULES missing');
    playwright = createRequire(
      join(process.env.PARTNERHUB_TEST_NODE_MODULES, '__consent_probe__.cjs')
    )('playwright');
  } catch (error) {
    throw new Error(
      `BLOCKED: existing Playwright unavailable: ${error.message}`
    );
  }
  const fixture = options.packageDirectory
    ? { directory: options.packageDirectory }
    : await generateReviewedPackage(t, {
        fixtureProviders:
          providers.ga4 || providers.meta ? providers : undefined
      });
  const files = new Map();
  for (const name of [
    'index.html',
    'config.js',
    'app.js',
    'measurement-runtime.js',
    'styles.css',
    'favicon.svg'
  ])
    files.set(name, await readFile(resolve(fixture.directory, name)));
  if (!options.packageDirectory) {
    if (options.configPatch) {
      const config = JSON.parse(
        runInNewContext(
          `${files.get('config.js').toString()}\nJSON.stringify(CONFIG)`,
          {},
          { timeout: 1000 }
        )
      );
      // Explicit hostile-config fixtures only; normal browser execution uses the real generated config bytes.
      Object.assign(config, options.configPatch);
      files.set(
        'config.js',
        Buffer.from(
          `const CONFIG = ${JSON.stringify(config)}; window.CONFIG = CONFIG;\n`
        )
      );
    }
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({
      channel: 'chrome',
      headless: true
    });
  } catch (error) {
    throw new Error(
      `BLOCKED: installed Chrome unavailable (no download/profile reuse): ${error.message}`
    );
  }
  const context = await browser.newContext({
    javaScriptEnabled,
    serviceWorkers: 'block',
    viewport: options.viewport || { width: 1440, height: 900 }
  });
  const requests = [],
    delayed = [],
    reloads = [];
  let closed = false;
  t.after(async () => {
    closed = true;
    for (const release of [...delayed, ...reloads]) release();
    await context.close();
    await browser.close();
  });
  await context.addInitScript(
    ({ storageFailure, holdReload }) => {
      window.__sdkLog = [];
      window.__intentions = [];
      window.__storageAccess = [];
      window.__channelPosts = [];
      const legacy = JSON.stringify({
        policyVersion: '2026-10-21',
        analytics: true,
        marketing: true,
        expiresAt: Date.now() + 99999999
      });
      for (const s of [localStorage, sessionStorage]) {
        try {
          s.setItem('ph:business-consent:v1:ana-business', legacy);
        } catch {
          /* browser store may be disabled */
        }
      }
      window.__storageFailure = storageFailure;
      // Browser boundary only: preserve the document after native runtime reload().
      // Chrome requires a real user gesture; every grant/withdraw below uses native input.
      if (holdReload)
        window.addEventListener('beforeunload', (event) => {
          event.preventDefault();
          event.returnValue = '';
        });
      for (const name of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (...args) {
          window.__storageAccess.push(name);
          if (window.__storageFailure) throw Error('offline storage failure');
          return original.apply(this, args);
        };
      }
      if (window.BroadcastChannel) {
        const Native = window.BroadcastChannel;
        window.BroadcastChannel = class extends Native {
          postMessage(value) {
            window.__channelPosts.push(value);
            return super.postMessage(value);
          }
        };
      }
      document.addEventListener(
        'click',
        (event) => {
          const a = event.target.closest && event.target.closest('a');
          if (a && /^https:\/\/(wa.me|api.whatsapp.com)\//.test(a.href)) {
            window.__intentions.push({
              trusted: event.isTrusted,
              href: a.href
            });
            event.preventDefault();
          }
        },
        true
      );
    },
    { storageFailure: options.storageFailure === true, holdReload }
  );
  const url = options.url || 'https://negocio.fixture.test/';
  const origin = new URL(url).origin;
  const documentCounts = new WeakMap();
  await context.route('**/*', async (route) => {
    const request = route.request(),
      target = new URL(request.url());
    const sdk =
      target.origin === 'https://www.googletagmanager.com' &&
      target.pathname === '/gtag/js'
        ? 'ga4'
        : target.href === 'https://connect.facebook.net/en_US/fbevents.js'
          ? 'meta'
          : null;
    const tracking =
      !!sdk ||
      /(^|\.)(facebook\.com|facebook\.net|google-analytics\.com|googletagmanager\.com)$/.test(
        target.hostname
      ) ||
      ['beacon', 'ping'].includes(request.resourceType());
    requests.push({
      url: target.href,
      type: request.resourceType(),
      sdk,
      tracking
    });
    try {
      if (sdk) {
        if (sdkMode === 'delayed') await new Promise((r) => delayed.push(r));
        if (closed) return;
        if (sdkMode === 'fail') return await route.abort('failed');
        const body =
          fakeSDK(sdk) +
          (sdkMode === 'withdraw-onload'
            ? '\nwindow.PartnerHubBusinessConsent.withdraw();'
            : '');
        return await route.fulfill({ contentType: 'text/javascript', body });
      }
      if (target.origin !== origin) return await route.abort('blockedbyclient');
      let name;
      if (
        request.isNavigationRequest() &&
        request.resourceType() === 'document'
      ) {
        const frame = request.frame();
        const count = (documentCounts.get(frame) || 0) + 1;
        documentCounts.set(frame, count);
        if (options.delayReload && count > 1) {
          await new Promise((r) => reloads.push(r));
          if (!closed) await route.abort('aborted');
          return;
        }
        name = 'index.html';
      } else name = decodeURIComponent(target.pathname.split('/').at(-1));
      if (!files.has(name)) return await route.abort('blockedbyclient');
      if (
        name === 'measurement-runtime.js' &&
        runtimeMode !== 'normal' &&
        !target.searchParams.has('late')
      ) {
        return runtimeMode === 'error'
          ? await route.fulfill({
              contentType: 'text/javascript',
              body: 'throw new Error("offline missing authority");'
            })
          : await route.abort('failed');
      }
      const contentType =
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml'
        }[extname(name)] || 'application/octet-stream';
      return await route.fulfill({ contentType, body: files.get(name) });
    } catch (error) {
      if (
        !closed &&
        !/Target.*closed|already handled|Invalid InterceptionId/.test(
          error.message
        )
      )
        throw error;
    }
  });
  const newPage = async () => {
    const p = await context.newPage();
    p.on('dialog', (dialog) => dialog.dismiss());
    p.setDefaultTimeout(10000);
    await p.goto(url, {
      waitUntil: 'domcontentloaded',
      referer: options.referer
    });
    if (javaScriptEnabled)
      await p.waitForFunction(
        () =>
          document
            .getElementById('business-consent-banner')
            .getAttribute('data-consent-initialized') === 'true'
      );
    return p;
  };
  const page = await newPage();
  return {
    page,
    context,
    origin,
    requests,
    javaScriptEnabled,
    newPage,
    releaseSDKs: async () => {
      for (const release of delayed.splice(0)) release();
      await page.waitForTimeout(80);
    },
    capture: async (name) => {
      if (!process.env.BUSINESS_CONSENT_SCREENSHOT_DIR) return;
      await mkdir(process.env.BUSINESS_CONSENT_SCREENSHOT_DIR, {
        recursive: true
      });
      const path = resolve(
        process.env.BUSINESS_CONSENT_SCREENSHOT_DIR,
        `${name}.png`
      );
      await page.screenshot({ path, fullPage: false });
      t.diagnostic(`capture: ${path}`);
    }
  };
}
