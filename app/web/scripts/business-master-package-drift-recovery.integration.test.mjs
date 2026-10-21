import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join, relative, resolve, sep } from "node:path";
import test from "node:test";

import {
  APPLY_CONFIRMATION as REFRESH_CONFIRMATION,
  APPLY_MODE as REFRESH_MODE,
  applyBusinessMasterPackageRefresh,
  planBusinessMasterPackageRefresh
} from "./jairo-business-master-package-drift-recovery.mjs";
import { planBusinessMasterPackage } from "./jairo-business-master-package.mjs";
import { createPublicationJobService } from "../server/services/publicationJobService.ts";
import { createPublicationJobWorker } from "../server/services/publicationJobWorkerService.ts";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");
const LEGACY_SOURCE_COMMIT = "16afb035f971b4495adb07983222f3461f87312c";
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const PRE_CONSENT_PACKAGE_HASH = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
const CURRENT_PACKAGE_HASH = "3c315bbe61729396cae8225c162367d3621f77c66b74b57560e7b29180e8f041";
const TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const SITE_ID = "ganomaster-business";
const BUSINESS_SITE_ID = "client-one-business";
const BUSINESS_PUBLIC_HOST = "negocio.clientone.pro";
const HISTORY_JOURNAL_RELATIVE = ".master-package-audits/CDX-20260827-002/apply.json";
const REFRESH_JOURNAL_RELATIVE = ".master-package-audits/CDX-20261019-003/refresh.json";
const ARCHIVE_RELATIVE = ".master-package-archives/CDX-20261019-003/ganomaster-business";
const REFRESH_CLAIM_RELATIVE = ".master-package-claims/ganomaster-business";
const PACKAGE_NO_CACHE_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

process.env.NODE_ENV = "test";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const inventoryHash = (entries) => sha256(JSON.stringify(entries
  .map(({ path, hash }) => ({ path, hash }))
  .sort((left, right) => left.path.localeCompare(right.path))));
const pathIn = (root, relativePath) => resolve(root, ...relativePath.split("/"));

function gitFile(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 10 * 1024 * 1024
  });
}

function buildPackage(templateBytes, names = TEMPLATE_FILES, htaccess = PACKAGE_NO_CACHE_HTACCESS) {
  const templateFiles = names.map((path) => ({ path, hash: sha256(templateBytes.get(path)) }));
  const canonicalTemplateHash = inventoryHash(templateFiles);
  const manifest = {
    schemaVersion: 1,
    siteId: SITE_ID,
    ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash,
    files: [...names, ".htaccess", "tipografia/"]
  };
  const packageBytes = new Map(templateBytes);
  packageBytes.set(".htaccess", Buffer.from(htaccess, "utf8"));
  packageBytes.set("manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
  const files = [...packageBytes.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { manifest, packageBytes, packageHash: inventoryHash(files), templateHash: canonicalTemplateHash };
}

async function writePackage(directory, packageBytes) {
  await mkdir(pathIn(directory, "tipografia"), { recursive: true });
  for (const [name, bytes] of packageBytes) await writeFile(pathIn(directory, name), bytes, { flag: "wx" });
}

async function inventory(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) {
        files.push({
          path: relative(directory, absolutePath).split(sep).join("/"),
          hash: sha256(await readFile(absolutePath))
        });
      } else throw new Error(`unexpected fixture entry: ${absolutePath}`);
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, hash: inventoryHash(files) };
}

async function writeJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

async function fixture() {
  const root = await mkdtemp(join(os.tmpdir(), "partnerhub-business-package-integration-"));
  const outputRoot = join(root, "generated-sites");
  const templateDirectory = join(root, "business-template");
  const sourceDirectory = join(root, "sources");
  const targetsDirectory = join(sourceDirectory, ".publishing-targets");
  const businessJobsDirectory = join(outputRoot, ".publication-jobs");
  const legacyTemplate = new Map(TEMPLATE_FILES.map((name) => [
    name,
    gitFile(LEGACY_SOURCE_COMMIT, `plantillas-de-pagina/business/${name}`)
  ]));
  const currentTemplate = new Map(TEMPLATE_FILES.map((name) => [
    name,
    gitFile("a8d547c1cf9d754573bf20eb5cc154a03f9f5c60", `plantillas-de-pagina/business/${name}`)
  ]));
  const legacyPackage = buildPackage(legacyTemplate);
  assert.equal(buildPackage(currentTemplate).packageHash, PRE_CONSENT_PACKAGE_HASH, "pre-consent canonical hash stays frozen");
  currentTemplate.set("measurement-runtime.js", Buffer.from("window.fixtureRuntime = true;\n"));
  const currentPackage = buildPackage(currentTemplate,
    ["app.js", "config.js", "favicon.svg", "index.html", "measurement-runtime.js", "styles.css"],
    PACKAGE_NO_CACHE_HTACCESS.replace("config\\.js|", "config\\.js|measurement-runtime\\.js|"));
  assert.equal(legacyPackage.templateHash, "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31");
  assert.equal(legacyPackage.packageHash, LEGACY_PACKAGE_HASH, "fixture must reconstruct the only allowed historical package");
  assert.equal(currentPackage.packageHash, CURRENT_PACKAGE_HASH, "synthetic runtime fixture, not a production release approval");

  await mkdir(outputRoot, { recursive: true });
  await mkdir(templateDirectory, { recursive: true });
  await mkdir(targetsDirectory, { recursive: true });
  await mkdir(businessJobsDirectory, { recursive: true });
  for (const [name, bytes] of currentTemplate) await writeFile(join(templateDirectory, name), bytes, { flag: "wx" });

  const masterDirectory = join(outputRoot, SITE_ID);
  await writePackage(masterDirectory, legacyPackage.packageBytes);
  const historyJournalPath = pathIn(outputRoot, HISTORY_JOURNAL_RELATIVE);
  const historyJournal = {
    requestId: "CDX-20260827-002",
    mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE",
    outcome: "APPLIED",
    siteId: SITE_ID,
    planHash: "a".repeat(64),
    canonicalTemplateHash: legacyPackage.templateHash,
    expectedPackageHash: LEGACY_PACKAGE_HASH,
    appliedAt: "2026-08-27T19:30:00.000Z"
  };
  const historyJournalBytes = Buffer.from(`${JSON.stringify(historyJournal, null, 2)}\n`, "utf8");
  await mkdir(resolve(historyJournalPath, ".."), { recursive: true });
  await writeFile(historyJournalPath, historyJournalBytes, { flag: "wx" });

  const source = {
    ecosystemType: "BUSINESS",
    site: { id: BUSINESS_SITE_ID, domain: BUSINESS_PUBLIC_HOST, title: "Client One" }
  };
  const target = {
    version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    siteId: BUSINESS_SITE_ID,
    ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "clientone.pro",
    publicHost: BUSINESS_PUBLIC_HOST,
    remoteRoot: "/home/clientone/domains/clientone.pro/public_html/negocio",
    provisioningState: "READY",
    publicationState: "PENDING"
  };
  await writeJson(join(sourceDirectory, `${BUSINESS_SITE_ID}.json`), source);
  await writeJson(join(targetsDirectory, `${BUSINESS_SITE_ID}.json`), target);

  return {
    root,
    outputRoot,
    templateDirectory,
    sourceDirectory,
    targetsDirectory,
    businessJobsDirectory,
    masterDirectory,
    historyJournalPath,
    historyJournalBytes,
    legacyPackage,
    currentPackage,
    options: { outputRoot, templateDirectory, businessJobsDirectory },
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

test("integrates guarded master refresh, historical readback, publication intent and worker claim race without providers", async () => {
  const item = await fixture();
  try {
    const before = await inventory(item.masterDirectory);
    assert.equal(before.hash, LEGACY_PACKAGE_HASH);
    const refreshPreview = await planBusinessMasterPackageRefresh(item.options);
    assert.equal(refreshPreview.blocked, false);
    assert.equal(refreshPreview.changed, false);
    assert.equal(refreshPreview.planMaterial.previousPackageHash, LEGACY_PACKAGE_HASH);
    assert.equal(refreshPreview.safety.providerCallsMade, false);

    const applied = await applyBusinessMasterPackageRefresh({
      ...item.options,
      mode: REFRESH_MODE,
      confirmation: REFRESH_CONFIRMATION,
      expectedPlanHash: refreshPreview.planHash
    });
    assert.equal(applied.blocked, false);
    assert.equal(applied.outcome, "APPLIED");
    assert.equal(applied.destination.hash, CURRENT_PACKAGE_HASH);
    assert.equal(applied.safety.providerCallsMade, false);
    assert.equal((await inventory(pathIn(item.outputRoot, ARCHIVE_RELATIVE))).hash, LEGACY_PACKAGE_HASH);
    assert.deepEqual(await readFile(item.historyJournalPath), item.historyJournalBytes);
    assert.equal(await readFile(pathIn(item.outputRoot, REFRESH_JOURNAL_RELATIVE), "utf8").then((text) => JSON.parse(text).previousPackageHash), LEGACY_PACKAGE_HASH);

    const historicalPreview = await planBusinessMasterPackage(item.options);
    assert.equal(historicalPreview.blocked, false);
    assert.equal(historicalPreview.disposition, "ALREADY_APPLIED");
    assert.equal(historicalPreview.destination.hash, CURRENT_PACKAGE_HASH);

    const publicationJobs = createPublicationJobService({
      sourceDirectory: item.sourceDirectory,
      outputDirectory: item.outputRoot,
      jobDirectory: item.businessJobsDirectory
    });
    const queued = await publicationJobs.enqueue({ siteId: BUSINESS_SITE_ID }, "integration-test-subject");
    assert.equal(queued.created, true);
    assert.equal(queued.job.status, "QUEUED");
    assert.equal(queued.job.intent.masterPackageHash, CURRENT_PACKAGE_HASH);

    let externalExecutionCalls = 0;
    const jobsWithRefreshRace = {
      ...publicationJobs,
      async claimNext(...args) {
        const claimed = await publicationJobs.claimNext(...args);
        if (claimed) await mkdir(pathIn(item.outputRoot, REFRESH_CLAIM_RELATIVE));
        return claimed;
      }
    };
    const worker = createPublicationJobWorker({
      jobs: jobsWithRefreshRace,
      execution: {
        async execute() {
          externalExecutionCalls += 1;
          throw new Error("integration must not invoke external publication execution");
        }
      },
      workerId: "integration-worker"
    });
    const workerResult = await worker.runNext();
    assert.equal(workerResult.outcome, "DEFERRED");
    assert.equal(workerResult.job.status, "QUEUED");
    assert.equal(workerResult.job.attemptCount, 0);
    assert.equal(externalExecutionCalls, 0);
  } finally {
    await item.cleanup();
  }
});
