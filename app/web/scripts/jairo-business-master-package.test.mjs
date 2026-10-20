import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

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

  const oldPackageFile = Buffer.from("preserved legacy package\n", "utf8");
  const oldManifest = Buffer.from(`${JSON.stringify({
    schemaVersion: 1,
    siteId: "ganomaster-business",
    ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash: "a".repeat(64),
    files: ["legacy.txt"]
  }, null, 2)}\n`, "utf8");
  const previousPackageHash = inventoryHash([
    { path: "legacy.txt", hash: sha256(oldPackageFile) },
    { path: "manifest.json", hash: sha256(oldManifest) }
  ]);
  await mkdir(archiveDirectory, { recursive: true });
  await writeFile(resolve(archiveDirectory, "legacy.txt"), oldPackageFile);
  await writeFile(resolve(archiveDirectory, "manifest.json"), oldManifest);

  const originalJournal = {
    requestId: "CDX-20260827-002",
    mode: APPLY_MODE,
    outcome: "APPLIED",
    siteId: "ganomaster-business",
    planHash: "b".repeat(64),
    canonicalTemplateHash: "a".repeat(64),
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
    oldPackageFile,
    oldManifest,
    originalJournal,
    refreshJournal
  };
}

async function snapshotLineage(item) {
  const readHash = async (path) => sha256(await readFile(path));
  const archiveFilePath = resolve(item.archiveDirectory, "legacy.txt");
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
      files: ["legacy.txt"]
    }, null, 2)}\n`, "utf8");
    const archiveHash = inventoryHash([
      { path: "legacy.txt", hash: sha256(item.oldPackageFile) },
      { path: "manifest.json", hash: sha256(foreignManifest) }
    ]);
    await writeFile(resolve(item.archiveDirectory, "manifest.json"), foreignManifest);
    const originalJournal = { ...item.originalJournal, expectedPackageHash: archiveHash };
    const originalJournalBytes = Buffer.from(`${JSON.stringify(originalJournal, null, 2)}\n`, "utf8");
    await writeFile(item.legacyJournalPath, originalJournalBytes);
    await writeJson(item.refreshJournalPath, {
      ...item.refreshJournal,
      previousPackageHash: archiveHash,
      archivedPackageHash: archiveHash,
      previousJournalHash: sha256(originalJournalBytes)
    });

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
      files: ["legacy.txt"]
    }, null, 2)}\n`, "utf8");
    const archiveHash = inventoryHash([
      { path: "legacy.txt", hash: sha256(item.oldPackageFile) },
      { path: "manifest.json", hash: sha256(changedManifest) }
    ]);
    await writeFile(resolve(item.archiveDirectory, "manifest.json"), changedManifest);
    const originalJournal = { ...item.originalJournal, expectedPackageHash: archiveHash };
    const originalJournalBytes = Buffer.from(`${JSON.stringify(originalJournal, null, 2)}\n`, "utf8");
    await writeFile(item.legacyJournalPath, originalJournalBytes);
    await writeJson(item.refreshJournalPath, {
      ...item.refreshJournal,
      previousPackageHash: archiveHash,
      archivedPackageHash: archiveHash,
      previousJournalHash: sha256(originalJournalBytes)
    });

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
    const archiveFile = resolve(item.archiveDirectory, "legacy.txt");
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

    await mkdir(item.archiveDirectory, { recursive: true });
    await writeFile(archiveFile, item.oldPackageFile);
    await writeFile(resolve(item.archiveDirectory, "manifest.json"), item.oldManifest);
    await writeFile(item.legacyJournalPath, `${JSON.stringify(item.originalJournal, null, 2)}\nchanged`);
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.notEqual(preview.disposition, "ALREADY_APPLIED");
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_LEGACY_JOURNAL_HASH_DRIFT"));
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
