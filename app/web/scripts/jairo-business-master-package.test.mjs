import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPLY_CONFIRMATION,
  APPLY_MODE,
  applyBusinessMasterPackage,
  planBusinessMasterPackage
} from "./jairo-business-master-package.mjs";

const canonicalConfig = `const CONFIG = {
  ecosystemType: "BUSINESS",
  site: { id: "ganomaster-business", appName: "ganomaster-business" },
  distributor: {
    brandName: "", firstName: "", fullName: "", role: "",
    whatsappNumber: "", phoneNumber: "", displayPhone: "",
    ctaUrl: "", defaultMessage: ""
  },
  hero: {},
  vsl: { provider: "custom", embedUrl: "https://media.example/business.mp4" },
  cta: { primaryUrl: "", secondaryUrl: "", directRegisterUrl: "" }
};
`;

const LEGACY_SNAPSHOT_COMMIT = "16afb035f971b4495adb07983222f3461f87312c";
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const LEGACY_TEMPLATE_HASH = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const LEGACY_TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const LEGACY_MANIFEST_FILES = [...LEGACY_TEMPLATE_FILES, ".htaccess", "tipografia/"];
const LEGACY_ARCHIVE_FILE_PATHS = [".htaccess", ...LEGACY_TEMPLATE_FILES, "manifest.json"]
  .sort((left, right) => left.localeCompare(right));
const LEGACY_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function fixture() {
  const root = await mkdtemp(resolve(os.tmpdir(), "partnerhub-business-master-"));
  const outputRoot = resolve(root, "output");
  const templateDirectory = resolve(root, "template");
  await Promise.all([mkdir(outputRoot), mkdir(templateDirectory)]);
  await Promise.all([
    writeFile(resolve(templateDirectory, "app.js"), "app"),
    writeFile(resolve(templateDirectory, "config.js"), canonicalConfig),
    writeFile(resolve(templateDirectory, "favicon.svg"), "<svg/>"),
    writeFile(resolve(templateDirectory, "index.html"), "<html></html>"),
    writeFile(resolve(templateDirectory, "styles.css"), "body{}")
  ]);
  return {
    root,
    options: { outputRoot, templateDirectory },
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const inventoryHash = (entries) => sha256(JSON.stringify(entries.map(({ path, hash }) => ({ path, hash }))));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

function createHistoricalPackage() {
  const packageFiles = new Map(LEGACY_TEMPLATE_FILES.map((name) => [
    name,
    execFileSync("git", ["show", `${LEGACY_SNAPSHOT_COMMIT}:plantillas-de-pagina/business/${name}`], {
      cwd: REPOSITORY_ROOT,
      maxBuffer: 2 * 1024 * 1024
    })
  ]));
  const canonicalFiles = [...packageFiles.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const canonicalTemplateHash = inventoryHash(canonicalFiles);
  assert.equal(canonicalTemplateHash, LEGACY_TEMPLATE_HASH, "historical template snapshot must match its recorded inventory hash");
  packageFiles.set(".htaccess", Buffer.from(LEGACY_HTACCESS, "utf8"));
  const manifest = {
    schemaVersion: 1,
    siteId: "ganomaster-business",
    ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash,
    files: LEGACY_MANIFEST_FILES
  };
  packageFiles.set("manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
  const packageInventory = [...packageFiles.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const packageHash = inventoryHash(packageInventory);
  assert.equal(packageHash, LEGACY_PACKAGE_HASH, "historical package fixture must match its recorded package hash");
  return { packageFiles, manifest, packageInventory, packageHash };
}

async function writeHistoricalArchive(directory, historicalPackage = createHistoricalPackage()) {
  await mkdir(directory, { recursive: true });
  for (const [path, bytes] of historicalPackage.packageFiles) {
    await writeFile(resolve(directory, path), bytes);
  }
  await mkdir(resolve(directory, "tipografia"), { recursive: true });
  return historicalPackage;
}

async function inventoryDirectory(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        files.push({ path: path.slice(directory.length + 1).split(/[\\/]/).join("/"), hash: sha256(await readFile(path)) });
      } else throw new Error("TEST_FIXTURE_SPECIAL_FILE_FORBIDDEN");
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, hash: inventoryHash(files) };
}

async function bindLineageToArchive(item, { canonicalTemplateHash } = {}) {
  const archive = await inventoryDirectory(item.archiveDirectory);
  const originalJournal = {
    ...item.originalJournal,
    canonicalTemplateHash: canonicalTemplateHash ?? item.originalJournal.canonicalTemplateHash,
    expectedPackageHash: archive.hash
  };
  await writeJson(item.legacyJournalPath, originalJournal);
  const originalJournalBytes = await readFile(item.legacyJournalPath);
  const refreshJournal = {
    ...item.refreshJournal,
    previousPackageHash: archive.hash,
    archivedPackageHash: archive.hash,
    previousJournalHash: sha256(originalJournalBytes)
  };
  await writeJson(item.refreshJournalPath, refreshJournal);
  item.originalJournal = originalJournal;
  item.refreshJournal = refreshJournal;
  return archive;
}

async function refreshedFixture() {
  const item = await fixture();
  const outputRoot = item.options.outputRoot;
  const legacyJournalPath = resolve(outputRoot, ".master-package-audits", "CDX-20260827-002", "apply.json");
  const refreshJournalPath = resolve(outputRoot, ".master-package-audits", "CDX-20261019-003", "refresh.json");
  const archiveDirectory = resolve(outputRoot, ".master-package-archives", "CDX-20261019-003", "ganomaster-business");
  const firstPreview = await planBusinessMasterPackage(item.options);
  await applyBusinessMasterPackage({
    ...item.options,
    mode: APPLY_MODE,
    confirmation: APPLY_CONFIRMATION,
    expectedPlanHash: firstPreview.planHash
  });

  const historicalPackage = await writeHistoricalArchive(archiveDirectory);
  const previousPackageHash = historicalPackage.packageHash;

  const originalJournal = {
    requestId: "CDX-20260827-002",
    mode: APPLY_MODE,
    outcome: "APPLIED",
    siteId: "ganomaster-business",
    planHash: "b".repeat(64),
    canonicalTemplateHash: LEGACY_TEMPLATE_HASH,
    expectedPackageHash: previousPackageHash,
    appliedAt: "2026-08-27T12:00:00.000Z"
  };
  const originalJournalBytes = Buffer.from(`${JSON.stringify(originalJournal, null, 2)}\n`, "utf8");
  await writeFile(legacyJournalPath, originalJournalBytes);

  const refreshJournal = {
    schemaVersion: 1,
    operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
    requestId: "CDX-20261019-003",
    siteId: "ganomaster-business",
    ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro",
    planHash: "c".repeat(64),
    previousPackageHash,
    refreshedPackageHash: firstPreview.planMaterial.expectedPackageHash,
    canonicalTemplateHash: firstPreview.planMaterial.canonicalTemplateHash,
    previousJournalPath: legacyJournalPath,
    previousJournalHash: sha256(originalJournalBytes),
    archivePath: archiveDirectory,
    archivedPackageHash: previousPackageHash,
    appliedAt: "2026-10-19T12:00:00.000Z"
  };
  await mkdir(dirname(refreshJournalPath), { recursive: true });
  await writeJson(refreshJournalPath, refreshJournal);

  return {
    ...item,
    legacyJournalPath,
    refreshJournalPath,
    archiveDirectory,
    historicalPackage,
    originalJournal,
    refreshJournal
  };
}

async function snapshotLineage(item) {
  const readHash = async (path) => sha256(await readFile(path));
  const archiveFilePath = resolve(item.archiveDirectory, ".htaccess");
  const destinationDirectory = resolve(item.options.outputRoot, "ganomaster-business");
  return {
    destinationHash: await readHash(resolve(destinationDirectory, "manifest.json")),
    destinationDirectoryMtimeNs: (await lstat(destinationDirectory, { bigint: true })).mtimeNs.toString(),
    legacyJournalHash: await readHash(item.legacyJournalPath),
    refreshJournalHash: await readHash(item.refreshJournalPath),
    archiveFileHash: await readHash(archiveFilePath),
    archiveManifestHash: await readHash(resolve(item.archiveDirectory, "manifest.json"))
  };
}

test("PREVIEW is read-only and plans the missing canonical Business master", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.mode, "PREVIEW");
    assert.equal(preview.changed, false);
    assert.equal(preview.blocked, false);
    assert.equal(preview.disposition, "CREATE_LOCAL_MASTER_PACKAGE");
    assert.match(preview.planHash, /^[0-9a-f]{64}$/);
    assert.equal(preview.planMaterial.destinationHash, "ABSENT");
    assert.equal(preview.safety.providerCallsMade, false);
    assert.equal(preview.safety.localWritesMade, false);
  } finally {
    await item.cleanup();
  }
});

test("missing or unsafe canonical template blocks before writes", async () => {
  const item = await fixture();
  try {
    await rm(resolve(item.options.templateDirectory, "app.js"));
    let preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.deepEqual(preview.blockedReasons, ["BUSINESS_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE"]);

    await writeFile(resolve(item.options.templateDirectory, "app.js"), "app");
    await writeFile(resolve(item.options.templateDirectory, "config.js"), canonicalConfig.replace('whatsappNumber: ""', 'whatsappNumber: "573000000000"'));
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_CANONICAL_MASTER_DISTRIBUTOR_NOT_EMPTY:whatsappNumber"));
  } finally {
    await item.cleanup();
  }
});

test("APPLY rejects mode, confirmation and plan drift without creating destination", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await assert.rejects(
      () => applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: "WRONG", expectedPlanHash: preview.planHash }),
      /CONFIRMATION_REQUIRED/
    );
    await assert.rejects(
      () => applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) }),
      /PLAN_HASH_MISMATCH/
    );
    const after = await planBusinessMasterPackage(item.options);
    assert.equal(after.planMaterial.destinationHash, "ABSENT");
  } finally {
    await item.cleanup();
  }
});

test("authorized APPLY installs deterministic package, journal and cleans claim", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    const result = await applyBusinessMasterPackage({
      ...item.options,
      mode: APPLY_MODE,
      confirmation: APPLY_CONFIRMATION,
      expectedPlanHash: preview.planHash
    });
    assert.equal(result.outcome, "APPLIED");
    assert.equal(result.changed, true);
    assert.equal(result.destination.hash, preview.planMaterial.expectedPackageHash);
    assert.equal(JSON.parse(await readFile(resolve(item.options.outputRoot, "ganomaster-business", "manifest.json"), "utf8")).siteId, "ganomaster-business");
    const rerun = await planBusinessMasterPackage(item.options);
    assert.equal(rerun.blocked, false);
    assert.equal(rerun.disposition, "ALREADY_APPLIED");
    assert.equal(rerun.destination.typographyDirectoryPresent, true);
  } finally {
    await item.cleanup();
  }
});

test("exact rerun is ALREADY_APPLIED and does not rewrite package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
    const rerunPreview = await planBusinessMasterPackage(item.options);
    const result = await applyBusinessMasterPackage({
      ...item.options,
      mode: APPLY_MODE,
      confirmation: APPLY_CONFIRMATION,
      expectedPlanHash: rerunPreview.planHash
    });
    assert.equal(result.outcome, "ALREADY_APPLIED");
    assert.equal(result.changed, false);
  } finally {
    await item.cleanup();
  }
});

test("destination drift and claim collision block fail-closed", async () => {
  const item = await fixture();
  try {
    await mkdir(resolve(item.options.outputRoot, "ganomaster-business"));
    await writeFile(resolve(item.options.outputRoot, "ganomaster-business", "foreign.txt"), "foreign");
    let preview = await planBusinessMasterPackage(item.options);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_DRIFT"));

    await rm(resolve(item.options.outputRoot, "ganomaster-business"), { recursive: true });
    await mkdir(resolve(item.options.outputRoot, ".master-package-claims", "ganomaster-business"), { recursive: true });
    preview = await planBusinessMasterPackage(item.options);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_CLAIM_PRESENT"));
  } finally {
    await item.cleanup();
  }
});

test("journal drift blocks an otherwise exact package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
    const journalPath = resolve(item.options.outputRoot, ".master-package-audits", "CDX-20260827-002", "apply.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    journal.expectedPackageHash = "0".repeat(64);
    await writeFile(journalPath, `${JSON.stringify(journal)}\n`);
    const after = await planBusinessMasterPackage(item.options);
    assert.ok(after.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW accepts a refreshed package only when the complete fixed lineage validates", async () => {
  const item = await refreshedFixture();
  try {
    const before = await snapshotLineage(item);
    const historicalArchive = await inventoryDirectory(item.archiveDirectory);
    const first = await planBusinessMasterPackage(item.options);
    const second = await planBusinessMasterPackage(item.options);
    assert.equal(first.blocked, false);
    assert.equal(first.disposition, "ALREADY_APPLIED");
    assert.equal(first.changed, false);
    assert.equal(first.destination.hash, first.planMaterial.expectedPackageHash);
    assert.deepEqual(first.planMaterial.destinationIdentity, {
      siteId: "ganomaster-business",
      ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro",
      canonicalTemplateHash: first.planMaterial.canonicalTemplateHash
    });
    assert.equal(first.planHash, second.planHash);
    assert.equal(first.planMaterial.lineage.refreshJournalHash, before.refreshJournalHash);
    assert.equal(first.planMaterial.lineage.legacyJournalHash, before.legacyJournalHash);
    assert.equal(first.planMaterial.lineage.archiveHash, item.refreshJournal.previousPackageHash);
    assert.equal(first.planMaterial.lineage.archiveHash, LEGACY_PACKAGE_HASH);
    assert.deepEqual(first.planMaterial.lineage.archiveDirectories, ["tipografia"]);
    assert.equal(historicalArchive.hash, LEGACY_PACKAGE_HASH);
    assert.deepEqual(historicalArchive.files.map(({ path }) => path), LEGACY_ARCHIVE_FILE_PATHS);
    assert.deepEqual(item.historicalPackage.manifest.files, LEGACY_MANIFEST_FILES);
    assert.equal(item.historicalPackage.manifest.canonicalTemplateHash, LEGACY_TEMPLATE_HASH);
    assert.deepEqual(await snapshotLineage(item), before);

    const applied = await applyBusinessMasterPackage({
      ...item.options,
      mode: APPLY_MODE,
      confirmation: APPLY_CONFIRMATION,
      expectedPlanHash: first.planHash
    });
    assert.equal(applied.outcome, "ALREADY_APPLIED");
    assert.equal(applied.changed, false);
    assert.equal(applied.destination.hash, first.destination.hash);
    assert.deepEqual(await snapshotLineage(item), before);
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks a corrupt refresh journal and does not report ALREADY_APPLIED", async () => {
  const item = await refreshedFixture();
  try {
    await writeFile(item.refreshJournalPath, "{corrupt\n");
    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_INVALID"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks an archive with foreign identity even when its hashes are self-consistent", async () => {
  const item = await refreshedFixture();
  try {
    const foreignManifest = Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      siteId: "foreign-site",
      ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro",
      source: "CANONICAL_BUSINESS_TEMPLATE",
      canonicalTemplateHash: item.originalJournal.canonicalTemplateHash,
      files: LEGACY_MANIFEST_FILES
    }, null, 2)}\n`, "utf8");
    await writeFile(resolve(item.archiveDirectory, "manifest.json"), foreignManifest);
    await bindLineageToArchive(item);

    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_ARCHIVE_IDENTITY_INVALID"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks archived template lineage that disagrees with the preserved journal", async () => {
  const item = await refreshedFixture();
  try {
    const changedManifest = Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      siteId: "ganomaster-business",
      ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro",
      source: "CANONICAL_BUSINESS_TEMPLATE",
      canonicalTemplateHash: "d".repeat(64),
      files: LEGACY_MANIFEST_FILES
    }, null, 2)}\n`, "utf8");
    await writeFile(resolve(item.archiveDirectory, "manifest.json"), changedManifest);
    await bindLineageToArchive(item);

    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_LINEAGE_DRIFT"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks a missing or tampered archive and a changed original journal", async () => {
  const item = await refreshedFixture();
  try {
    const archiveFile = resolve(item.archiveDirectory, ".htaccess");
    await writeFile(archiveFile, "tampered legacy package\n");
    let preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_ARCHIVE_DRIFT"));

    await rm(item.archiveDirectory, { recursive: true });
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_ARCHIVE_MISSING"));

    await writeHistoricalArchive(item.archiveDirectory, item.historicalPackage);
    await writeFile(item.legacyJournalPath, `${JSON.stringify(item.originalJournal, null, 2)}\nchanged`);
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_LEGACY_JOURNAL_HASH_DRIFT"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW rejects a synthetic but internally coherent archive with an unrecognized package hash", async () => {
  const item = await refreshedFixture();
  try {
    await writeFile(resolve(item.archiveDirectory, "app.js"), "synthetic archive bytes\n");
    const syntheticArchive = await bindLineageToArchive(item);
    assert.notEqual(syntheticArchive.hash, LEGACY_PACKAGE_HASH);
    assert.deepEqual(syntheticArchive.files.map(({ path }) => path), LEGACY_ARCHIVE_FILE_PATHS);
    assert.deepEqual(JSON.parse(await readFile(resolve(item.archiveDirectory, "manifest.json"), "utf8")).files, LEGACY_MANIFEST_FILES);
    const legacyJournalBytes = await readFile(item.legacyJournalPath);
    assert.equal(item.originalJournal.expectedPackageHash, syntheticArchive.hash);
    assert.equal(item.refreshJournal.previousPackageHash, syntheticArchive.hash);
    assert.equal(item.refreshJournal.archivedPackageHash, syntheticArchive.hash);
    assert.equal(item.refreshJournal.previousJournalHash, sha256(legacyJournalBytes));

    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW rejects a self-consistent historical archive with an altered manifest files list", async () => {
  const item = await refreshedFixture();
  try {
    const manifestPath = resolve(item.archiveDirectory, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.files = manifest.files.filter((path) => path !== ".htaccess");
    await writeJson(manifestPath, manifest);
    const alteredArchive = await bindLineageToArchive(item);
    assert.notEqual(alteredArchive.hash, LEGACY_PACKAGE_HASH);

    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW rejects unlisted empty directories in the historical archive", async () => {
  const item = await refreshedFixture();
  try {
    await mkdir(resolve(item.archiveDirectory, "unlisted"));
    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_ARCHIVE_DRIFT"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks unlisted empty directories in the installed refreshed package", async () => {
  const item = await refreshedFixture();
  try {
    await mkdir(resolve(item.options.outputRoot, "ganomaster-business", "unlisted-empty-directory"));
    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_DRIFT"));
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks missing original evidence, tampered identity and non-allowlisted journal paths", async () => {
  const item = await refreshedFixture();
  try {
    await rm(item.refreshJournalPath);
    let preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_MISSING"));

    await writeJson(item.refreshJournalPath, item.refreshJournal);
    await rm(item.legacyJournalPath);
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_LEGACY_JOURNAL_MISSING"));

    await writeJson(item.legacyJournalPath, item.originalJournal);
    const changedRefresh = { ...item.refreshJournal, siteId: "foreign-site" };
    await writeJson(item.refreshJournalPath, changedRefresh);
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");

    await writeJson(item.refreshJournalPath, {
      ...item.refreshJournal,
      previousJournalPath: resolve(item.root, "../../outside/apply.json")
    });
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");

    await writeJson(item.refreshJournalPath, {
      ...item.refreshJournal,
      archivePath: resolve(item.root, "../../outside/archive")
    });
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
  } finally {
    await item.cleanup();
  }
});

test("PREVIEW blocks a destination with changed package identity or a foreign refresh journal", async () => {
  const item = await refreshedFixture();
  try {
    const manifestPath = resolve(item.options.outputRoot, "ganomaster-business", "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.publicHost = "foreign.example";
    await writeJson(manifestPath, manifest);
    let preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");

    const first = await refreshedFixture();
    try {
      await writeJson(first.refreshJournalPath, {
        ...first.refreshJournal,
        requestId: "CDX-20990101-999"
      });
      preview = await planBusinessMasterPackage(first.options);
      assert.equal(preview.blocked, true);
      assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    } finally {
      await first.cleanup();
    }
  } finally {
    await item.cleanup();
  }
});
