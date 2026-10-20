import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join, relative, resolve, sep } from "node:path";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  APPLY_MODE,
  applyBusinessMasterPackageRefresh,
  planBusinessMasterPackageRefresh
} from "./jairo-business-master-package-drift-recovery.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");
const LEGACY_SOURCE_COMMIT = "16afb035f971b4495adb07983222f3461f87312c";
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const CANONICAL_V2_PACKAGE_HASH = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
const TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const PACKAGE_FILES = [".htaccess", ...TEMPLATE_FILES, "manifest.json"];
const REQUEST_ID = "CDX-20261019-003";
const SITE_ID = "ganomaster-business";
const HISTORY_JOURNAL_RELATIVE = ".master-package-audits/CDX-20260827-002/apply.json";
const REFRESH_JOURNAL_RELATIVE = ".master-package-audits/CDX-20261019-003/refresh.json";
const ARCHIVE_RELATIVE = ".master-package-archives/CDX-20261019-003/ganomaster-business";
const ARCHIVE_RESERVATION_RELATIVE = ".master-package-archives/CDX-20261019-003/ganomaster-business.reservation.json";
const CLAIM_RELATIVE = ".master-package-claims/ganomaster-business";
const NO_CACHE_HTACCESS = `DirectoryIndex index.html

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
const exists = (path) => access(path).then(() => true, () => false);

function gitFile(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

function buildExpectedPackage(templateBytes) {
  const templateFiles = TEMPLATE_FILES.map((path) => ({ path, hash: sha256(templateBytes.get(path)) }));
  const canonicalTemplateHash = inventoryHash(templateFiles);
  const manifest = {
    schemaVersion: 1,
    siteId: SITE_ID,
    ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash,
    files: [...TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  const packageBytes = new Map(templateBytes);
  packageBytes.set(".htaccess", Buffer.from(NO_CACHE_HTACCESS, "utf8"));
  packageBytes.set("manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
  const files = [...packageBytes.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { canonicalTemplateHash, manifest, packageBytes, files, packageHash: inventoryHash(files) };
}

async function writePackage(directory, packageBytes) {
  await mkdir(pathIn(directory, "tipografia"), { recursive: true });
  for (const [name, bytes] of packageBytes) {
    await writeFile(pathIn(directory, name), bytes, { flag: "wx" });
  }
}

async function inventory(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) files.push({
        path: relative(directory, absolutePath).split(sep).join("/"),
        hash: sha256(await readFile(absolutePath))
      });
      else throw new Error(`unexpected special file in fixture: ${absolutePath}`);
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, hash: inventoryHash(files) };
}

async function treeSnapshot(root) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        result.push({ path: relative(root, absolutePath).split(sep).join("/"), kind: "directory" });
        await visit(absolutePath);
      } else if (entry.isFile()) result.push({
        path: relative(root, absolutePath).split(sep).join("/"),
        kind: "file",
        hash: sha256(await readFile(absolutePath))
      });
      else result.push({ path: relative(root, absolutePath).split(sep).join("/"), kind: "special" });
    }
  }
  await visit(root);
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

async function fixture() {
  const root = await mkdtemp(join(os.tmpdir(), "partnerhub-business-master-refresh-"));
  const outputRoot = join(root, "generated-sites");
  const templateDirectory = join(root, "business-template");
  const businessJobsDirectory = join(outputRoot, ".publication-jobs");
  const legacyTemplateBytes = new Map(TEMPLATE_FILES.map((name) => [
    name,
    gitFile(LEGACY_SOURCE_COMMIT, `plantillas-de-pagina/business/${name}`)
  ]));
  const currentTemplateBytes = new Map(TEMPLATE_FILES.map((name) => [
    name,
    gitFile("HEAD", `plantillas-de-pagina/business/${name}`)
  ]));
  const legacy = buildExpectedPackage(legacyTemplateBytes);
  const canonical = buildExpectedPackage(currentTemplateBytes);
  assert.equal(legacy.canonicalTemplateHash, "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31");
  assert.equal(legacy.packageHash, LEGACY_PACKAGE_HASH, "legacy fixture must equal the only allowlisted package hash");
  assert.equal(canonical.canonicalTemplateHash, "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99");
  assert.equal(canonical.packageHash, CANONICAL_V2_PACKAGE_HASH, "current canonical fixture must produce the reviewed expected package hash");
  await mkdir(outputRoot, { recursive: true });
  await mkdir(templateDirectory, { recursive: true });
  await mkdir(businessJobsDirectory, { recursive: true });
  for (const [name, bytes] of currentTemplateBytes) await writeFile(join(templateDirectory, name), bytes);
  const destinationDirectory = pathIn(outputRoot, SITE_ID);
  await writePackage(destinationDirectory, legacy.packageBytes);
  const historyJournal = {
    requestId: "CDX-20260827-002",
    mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE",
    outcome: "APPLIED",
    siteId: SITE_ID,
    planHash: "a".repeat(64),
    canonicalTemplateHash: legacy.canonicalTemplateHash,
    expectedPackageHash: LEGACY_PACKAGE_HASH,
    appliedAt: "2026-08-27T19:30:00.000Z"
  };
  const historyJournalBytes = Buffer.from(`${JSON.stringify(historyJournal, null, 2)}\n`);
  const historyJournalPath = pathIn(outputRoot, HISTORY_JOURNAL_RELATIVE);
  await mkdir(resolve(historyJournalPath, ".."), { recursive: true });
  await writeFile(historyJournalPath, historyJournalBytes, { flag: "wx" });
  return {
    root,
    outputRoot,
    templateDirectory,
    businessJobsDirectory,
    destinationDirectory,
    historyJournalPath,
    historyJournalBytes,
    legacy,
    canonical,
    options: { outputRoot, templateDirectory, businessJobsDirectory },
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

function runningJob({ ecosystemType = "BUSINESS", expiresAt = "2026-01-01T00:00:00.000Z" } = {}) {
  const siteId = ecosystemType === "BUSINESS" ? SITE_ID : "ganomaster-product";
  const intent = {
    schemaVersion: 1,
    operation: "PUBLISH_PARTNER_ECOSYSTEM",
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    ownerSiteId: "ganomaster",
    siteId,
    ecosystemType,
    baseDomain: "ganomaster.pro",
    publicHost: ecosystemType === "BUSINESS" ? "business.ganomaster.pro" : "producto.ganomaster.pro",
    sourceHash: "a".repeat(64),
    targetHash: "b".repeat(64),
    masterPackageHash: "c".repeat(64)
  };
  const id = sha256(JSON.stringify(intent));
  return {
    schemaVersion: 1,
    id,
    intentHash: id,
    intent,
    status: "RUNNING",
    phase: "PUBLISHING",
    revision: 3,
    attemptCount: 1,
    requestedBySubjectHash: "d".repeat(64),
    createdAt: "2026-10-19T12:00:00.000Z",
    updatedAt: "2026-10-19T12:00:00.000Z",
    lease: { tokenHash: "e".repeat(64), workerHash: "f".repeat(64), acquiredAt: "2026-10-19T12:00:00.000Z", expiresAt },
    evidence: []
  };
}

async function saveJob(item, job) {
  await writeFile(join(item.businessJobsDirectory, `${job.id}.json`), `${JSON.stringify(job, null, 2)}\n`, { flag: "wx" });
}

async function authorizedApply(item, plan, extra = {}) {
  return applyBusinessMasterPackageRefresh({
    ...item.options,
    mode: APPLY_MODE,
    confirmation: APPLY_CONFIRMATION,
    expectedPlanHash: plan.planHash,
    ...extra
  });
}

test("PREVIEW is deterministic, read-only and preserves the allowlisted historical package and journal", async () => {
  const item = await fixture();
  try {
    const before = await treeSnapshot(item.outputRoot);
    const first = await planBusinessMasterPackageRefresh(item.options);
    const second = await planBusinessMasterPackageRefresh(item.options);
    assert.deepEqual(first, second);
    assert.equal(first.requestId, REQUEST_ID);
    assert.equal(first.mode, "PREVIEW");
    assert.equal(first.changed, false);
    assert.equal(first.blocked, false);
    assert.deepEqual(first.blockedReasons, []);
    assert.equal(first.planMaterial.identity.siteId, SITE_ID);
    assert.equal(first.planMaterial.identity.ecosystemType, "BUSINESS");
    assert.equal(first.planMaterial.identity.publicHost, "business.ganomaster.pro");
    assert.equal(first.planMaterial.previousPackageHash, LEGACY_PACKAGE_HASH);
    assert.equal(first.planMaterial.refreshedPackageHash, CANONICAL_V2_PACKAGE_HASH);
    assert.equal(first.planMaterial.previousJournalHash, sha256(item.historyJournalBytes));
    assert.equal(first.planMaterial.archivePresent, false);
    assert.deepEqual(first.planMaterial.activeBusinessJobs, []);
    assert.equal(first.safety.providerCallsMade, false);
    assert.equal(first.safety.localWritesMade, false);
    assert.deepEqual(await treeSnapshot(item.outputRoot), before);
  } finally {
    await item.cleanup();
  }
});
test("PREVIEW blocks identity or public path override attempts", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh({
      ...item.options,
      siteId: "someone-else-business",
      publicHost: "attacker.example",
      identity: { siteId: "someone-else-business", ecosystemType: "PRODUCT", publicHost: "attacker.example" }
    });
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_REFRESH_IDENTITY_OVERRIDE_FORBIDDEN"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks a changed or unknown installed package without writing or creating a claim", async () => {
  const item = await fixture();
  try {
    await writeFile(join(item.destinationDirectory, "foreign.txt"), "foreign");
    const preview = await planBusinessMasterPackageRefresh(item.options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_PREVIOUS_HASH_NOT_ALLOWLISTED"));
    assert.equal(await exists(pathIn(item.outputRoot, `${CLAIM_RELATIVE}/owner.json`)), false);
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks an unrecognized empty directory even when file inventory hash is unchanged", async () => {
  const item = await fixture();
  try {
    await mkdir(join(item.destinationDirectory, "unlisted-empty-directory"));
    const preview = await planBusinessMasterPackageRefresh(item.options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_PREVIOUS_INVENTORY_INVALID"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks a corrupted or incongruent legacy manifest and journal", async (t) => {
  for (const mutation of ["manifest-json", "manifest-identity", "journal-json", "journal-identity", "journal-hash", "journal-template"]) {
    await t.test(mutation, async () => {
      const item = await fixture();
      try {
        if (mutation.startsWith("manifest")) {
          const manifestPath = join(item.destinationDirectory, "manifest.json");
          if (mutation === "manifest-json") await writeFile(manifestPath, "{");
          else {
            const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
            manifest.publicHost = "evil.example";
            await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
          }
        } else {
          if (mutation === "journal-json") await writeFile(item.historyJournalPath, "{");
          else {
            const journal = JSON.parse(await readFile(item.historyJournalPath, "utf8"));
            if (mutation === "journal-identity") journal.siteId = "other-business";
            if (mutation === "journal-hash") journal.expectedPackageHash = "0".repeat(64);
            if (mutation === "journal-template") journal.canonicalTemplateHash = "0".repeat(64);
            await writeFile(item.historyJournalPath, `${JSON.stringify(journal, null, 2)}\n`);
          }
        }
        const preview = await planBusinessMasterPackageRefresh(item.options);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.length > 0);
      } finally {
        await item.cleanup();
      }
    });
  }
});

test("PREVIEW blocks an occupied archive, reservation or refresh journal without overwriting it", async (t) => {
  for (const occupiedPath of [ARCHIVE_RELATIVE, ARCHIVE_RESERVATION_RELATIVE, REFRESH_JOURNAL_RELATIVE]) {
    await t.test(occupiedPath, async () => {
      const item = await fixture();
      try {
        const target = pathIn(item.outputRoot, occupiedPath);
        if (occupiedPath === ARCHIVE_RELATIVE) {
          await mkdir(target, { recursive: true });
          await writeFile(join(target, "foreign.txt"), "keep");
        } else {
          await mkdir(resolve(target, ".."), { recursive: true });
          await writeFile(target, "keep");
        }
        const protectedPath = occupiedPath === ARCHIVE_RELATIVE ? join(target, "foreign.txt") : target;
        const before = await readFile(protectedPath);
        const preview = await planBusinessMasterPackageRefresh(item.options);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.some((reason) => reason.includes("ARCHIVE") || reason.includes("REFRESH_JOURNAL")));
        assert.deepEqual(await readFile(protectedPath), before);
      } finally {
        await item.cleanup();
      }
    });
  }
});

test("PREVIEW blocks malformed, foreign, and valid existing master claims without exposing owner tokens", async (t) => {
  for (const claimState of ["malformed", "foreign-valid"]) {
    await t.test(claimState, async () => {
      const item = await fixture();
      try {
        const claimDirectory = pathIn(item.outputRoot, CLAIM_RELATIVE);
        await mkdir(claimDirectory, { recursive: true });
        const ownerToken = "do-not-expose-this-token";
        const owner = claimState === "malformed"
          ? { schemaVersion: 999, ownerToken }
          : {
              schemaVersion: 1,
              operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
              ownerToken,
              planHash: "c".repeat(64),
              acquiredAt: "2026-10-19T10:00:00.000Z"
            };
        await writeFile(join(claimDirectory, "owner.json"), `${JSON.stringify(owner)}\n`);
        const preview = await planBusinessMasterPackageRefresh(item.options);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.some((reason) => reason.includes("CLAIM")));
        assert.equal(JSON.stringify(preview).includes(ownerToken), false);
      } finally {
        await item.cleanup();
      }
    });
  }
});

test("PREVIEW blocks every RUNNING Business job including expired leases, but not a classified Product job", async (t) => {
  for (const expiresAt of ["2026-10-19T23:59:59.000Z", "2026-01-01T00:00:00.000Z"]) {
    await t.test(`Business lease ${expiresAt}`, async () => {
      const item = await fixture();
      try {
        await saveJob(item, runningJob({ expiresAt }));
        const preview = await planBusinessMasterPackageRefresh(item.options);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_PUBLICATION_RUNNING"));
        assert.equal(preview.planMaterial.activeBusinessJobs.length, 1);
      } finally {
        await item.cleanup();
      }
    });
  }
  const item = await fixture();
  try {
    await saveJob(item, runningJob({ ecosystemType: "PRODUCT" }));
    const preview = await planBusinessMasterPackageRefresh(item.options);
    assert.equal(preview.blocked, false);
    assert.deepEqual(preview.planMaterial.activeBusinessJobs, []);
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW reads the configured publication job directory from the runtime environment", async () => {
  const item = await fixture();
  const previousValue = process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR;
  const configuredJobsDirectory = join(item.outputRoot, ".runtime-configured-publication-jobs");
  const options = { ...item.options };
  delete options.businessJobsDirectory;
  try {
    await mkdir(configuredJobsDirectory, { recursive: true });
    const job = runningJob();
    await writeFile(join(configuredJobsDirectory, `${job.id}.json`), `${JSON.stringify(job, null, 2)}\n`, { flag: "wx" });
    process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR = configuredJobsDirectory;
    const preview = await planBusinessMasterPackageRefresh(options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_PUBLICATION_RUNNING"));
    assert.equal(preview.planMaterial.activeBusinessJobs.length, 1);
  } finally {
    if (previousValue === undefined) delete process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR;
    else process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR = previousValue;
    await item.cleanup();
  }
});

test("PREVIEW blocks a configured publication job directory outside its safe output root", async () => {
  const item = await fixture();
  const previousValue = process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR;
  const configuredJobsDirectory = join(item.root, "outside-publication-jobs");
  const options = { ...item.options };
  delete options.businessJobsDirectory;
  try {
    await mkdir(configuredJobsDirectory, { recursive: true });
    const job = runningJob();
    await writeFile(join(configuredJobsDirectory, `${job.id}.json`), `${JSON.stringify(job, null, 2)}\n`, { flag: "wx" });
    process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR = configuredJobsDirectory;
    const preview = await planBusinessMasterPackageRefresh(options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_DIRECTORY_OUTSIDE_OUTPUT_ROOT"));
  } finally {
    if (previousValue === undefined) delete process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR;
    else process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR = previousValue;
    await item.cleanup();
  }
});

test("PREVIEW blocks corrupt and unclassifiable publication job files fail-closed", async (t) => {
  for (const content of ["{", JSON.stringify({ schemaVersion: 1, status: "RUNNING", intent: {} })]) {
    await t.test(content === "{" ? "invalid-json" : "unknown-ecosystem", async () => {
      const item = await fixture();
      try {
        await writeFile(join(item.businessJobsDirectory, `${"e".repeat(64)}.json`), content);
        const preview = await planBusinessMasterPackageRefresh(item.options);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_PUBLICATION_JOB_UNCLASSIFIABLE"));
      } finally {
        await item.cleanup();
      }
    });
  }
});

test("APPLY requires the exact mode, confirmation and reviewed plan hash before any write", async (t) => {
  for (const [name, override, message] of [
    ["mode", { mode: "APPLY" }, /APPLY_MODE_REQUIRED/],
    ["confirmation", { confirmation: "wrong" }, /CONFIRMATION_REQUIRED/],
    ["missing-hash", { expectedPlanHash: undefined }, /PLAN_HASH_REQUIRED/],
    ["bad-hash", { expectedPlanHash: "not-a-hash" }, /PLAN_HASH_REQUIRED/]
  ]) {
    await t.test(name, async () => {
      const item = await fixture();
      try {
        const before = await treeSnapshot(item.outputRoot);
        await assert.rejects(
          () => applyBusinessMasterPackageRefresh({
            ...item.options,
            mode: APPLY_MODE,
            confirmation: APPLY_CONFIRMATION,
            expectedPlanHash: "f".repeat(64),
            ...override
          }),
          message
        );
        assert.deepEqual(await treeSnapshot(item.outputRoot), before);
      } finally {
        await item.cleanup();
      }
    });
  }
});

test("APPLY rejects a stale plan without changing the destination, archive, history journal or claim", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await writeFile(join(item.destinationDirectory, "drift.txt"), "drift");
    const beforeDestination = await inventory(item.destinationDirectory);
    await assert.rejects(
      () => authorizedApply(item, preview),
      /PLAN_HASH_MISMATCH|BLOCKED|DRIFT/
    );
    assert.deepEqual(await inventory(item.destinationDirectory), beforeDestination);
    assert.deepEqual(await readFile(item.historyJournalPath), item.historyJournalBytes);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), false);
    assert.equal(await exists(pathIn(item.outputRoot, CLAIM_RELATIVE)), false);
  } finally {
    await item.cleanup();
  }
});

test("APPLY archives the exact prior package, installs verified canonical V2, writes lineage, preserves history bytes and releases only its own claim", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    const result = await authorizedApply(item, preview);
    const archiveDirectory = pathIn(item.outputRoot, ARCHIVE_RELATIVE);
    const installed = await inventory(item.destinationDirectory);
    const archived = await inventory(archiveDirectory);
    assert.equal(result.outcome, "APPLIED");
    assert.equal(result.changed, true);
    assert.equal(result.blocked, false);
    assert.equal(result.planHash, preview.planHash);
    assert.equal(installed.hash, CANONICAL_V2_PACKAGE_HASH);
    assert.equal(archived.hash, LEGACY_PACKAGE_HASH);
    assert.ok(await exists(join(item.destinationDirectory, "tipografia")));
    assert.deepEqual(await readFile(item.historyJournalPath), item.historyJournalBytes);
    const refreshJournalPath = pathIn(item.outputRoot, REFRESH_JOURNAL_RELATIVE);
    const journal = JSON.parse(await readFile(refreshJournalPath, "utf8"));
    assert.deepEqual(journal, {
      schemaVersion: 1,
      operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
      requestId: REQUEST_ID,
      siteId: SITE_ID,
      ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro",
      planHash: preview.planHash,
      previousPackageHash: LEGACY_PACKAGE_HASH,
      refreshedPackageHash: CANONICAL_V2_PACKAGE_HASH,
      canonicalTemplateHash: preview.planMaterial.canonicalTemplateHash,
      previousJournalPath: pathIn(item.outputRoot, HISTORY_JOURNAL_RELATIVE),
      previousJournalHash: sha256(item.historyJournalBytes),
      archivePath: archiveDirectory,
      archivedPackageHash: LEGACY_PACKAGE_HASH,
      appliedAt: journal.appliedAt
    });
    assert.ok(Number.isFinite(Date.parse(journal.appliedAt)));
    assert.equal(await exists(pathIn(item.outputRoot, CLAIM_RELATIVE)), false);
    assert.equal(result.safety.providerCallsMade, false);
    assert.equal(result.safety.sftpAdapterCreated, false);
  } finally {
    await item.cleanup();
  }
});

test("APPLY never cleans a claim that was replaced by another owner", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    const claimDirectory = pathIn(item.outputRoot, CLAIM_RELATIVE);
    const foreignOwner = {
      schemaVersion: 1,
      operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
      ownerToken: "foreign-owner-token",
      planHash: "c".repeat(64),
      acquiredAt: "2026-10-19T10:00:00.000Z"
    };
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: {
          afterClaim: async () => writeFile(join(claimDirectory, "owner.json"), `${JSON.stringify(foreignOwner)}\n`)
        }
      }),
      /CLAIM|DRIFT|OWNERSHIP/
    );
    assert.deepEqual(JSON.parse(await readFile(join(claimDirectory, "owner.json"), "utf8")), foreignOwner);
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), false);
  } finally {
    await item.cleanup();
  }
});

test("APPLY rechecks Business jobs under its claim and aborts before changing the package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: { afterClaim: async () => saveJob(item, runningJob()) }
      }),
      /PUBLICATION_RUNNING|BLOCKED|DRIFT/
    );
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), false);
    assert.equal(await exists(pathIn(item.outputRoot, CLAIM_RELATIVE)), false);
  } finally {
    await item.cleanup();
  }
});

test("APPLY rechecks claim ownership immediately before renaming the previous package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    const claimDirectory = pathIn(item.outputRoot, CLAIM_RELATIVE);
    const foreignOwner = {
      schemaVersion: 1,
      operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
      ownerToken: "foreign-owner-before-backup-rename",
      planHash: "c".repeat(64),
      acquiredAt: "2026-10-19T10:00:00.000Z"
    };
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: {
          beforePreviousBackupRename: async () => writeFile(join(claimDirectory, "owner.json"), `${JSON.stringify(foreignOwner)}\n`)
        }
      }),
      /CLAIM|OWNERSHIP/
    );
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.deepEqual(JSON.parse(await readFile(join(claimDirectory, "owner.json"), "utf8")), foreignOwner);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), true);
    assert.equal((await readdir(item.outputRoot)).some((name) => name.endsWith(".previous")), false);
  } finally {
    await item.cleanup();
  }
});

test("APPLY removes only its staging and claim after a verified pre-mutation abort", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: { afterStageVerified: async () => { throw new Error("injected staging abort"); } }
      }),
      /injected staging abort/
    );
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), false);
    assert.equal(await exists(pathIn(item.outputRoot, CLAIM_RELATIVE)), false);
    const stageResidues = (await readdir(item.outputRoot)).filter((name) => name.includes("CDX-20261019-003") && name.endsWith(".staging"));
    assert.deepEqual(stageResidues, []);
  } finally {
    await item.cleanup();
  }
});

test("APPLY restores the old package only when destination is absent, and preserves the claim after a post-archive failure", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: { afterArchive: async () => { throw new Error("injected post-archive failure"); } }
      }),
      /injected post-archive failure/
    );
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, ARCHIVE_RELATIVE)), false);
    assert.equal(await exists(pathIn(item.outputRoot, `${CLAIM_RELATIVE}/owner.json`)), true);
  } finally {
    await item.cleanup();
  }
});

test("APPLY preserves both package evidence and claim when destination and archive become ambiguous", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: {
          afterArchive: async () => {
            await mkdir(item.destinationDirectory, { recursive: false });
            await writeFile(join(item.destinationDirectory, "foreign.txt"), "do not overwrite");
            throw new Error("injected ambiguous destination");
          }
        }
      }),
      /injected ambiguous destination/
    );
    assert.equal((await inventory(pathIn(item.outputRoot, ARCHIVE_RELATIVE))).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await readFile(join(item.destinationDirectory, "foreign.txt"), "utf8"), "do not overwrite");
    assert.equal(await exists(pathIn(item.outputRoot, `${CLAIM_RELATIVE}/owner.json`)), true);
  } finally {
    await item.cleanup();
  }
});

test("APPLY preserves claim, archive and installed package if journal commit fails after replacement", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackageRefresh(item.options);
    await assert.rejects(
      () => authorizedApply(item, preview, {
        testHooks: { beforeJournalCommit: async () => { throw new Error("injected journal failure"); } }
      }),
      /injected journal failure/
    );
    assert.equal((await inventory(pathIn(item.outputRoot, ARCHIVE_RELATIVE))).hash, LEGACY_PACKAGE_HASH);
    assert.equal((await inventory(item.destinationDirectory)).hash, CANONICAL_V2_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, REFRESH_JOURNAL_RELATIVE)), false);
    assert.equal(await exists(pathIn(item.outputRoot, `${CLAIM_RELATIVE}/owner.json`)), true);
    assert.deepEqual(await readFile(item.historyJournalPath), item.historyJournalBytes);
  } finally {
    await item.cleanup();
  }
});

test("APPLY refuses an occupied archive without overwriting it or releasing a foreign claim", async () => {
  const item = await fixture();
  try {
    const archive = pathIn(item.outputRoot, ARCHIVE_RELATIVE);
    await mkdir(archive, { recursive: true });
    await writeFile(join(archive, "foreign.txt"), "preserve");
    const preview = await planBusinessMasterPackageRefresh(item.options);
    assert.equal(preview.blocked, true);
    await assert.rejects(() => authorizedApply(item, preview), /BLOCKED/);
    assert.equal(await readFile(join(archive, "foreign.txt"), "utf8"), "preserve");
    assert.equal((await inventory(item.destinationDirectory)).hash, LEGACY_PACKAGE_HASH);
    assert.equal(await exists(pathIn(item.outputRoot, CLAIM_RELATIVE)), false);
  } finally {
    await item.cleanup();
  }
});
