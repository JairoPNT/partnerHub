import { inside, isDescendant, inventoryHash, pathKind, assertSafeAncestors, inventory, packageShapeValid,
  validTimestamp, readClaimOwner, assertClaimOwner, inspectBusinessJobs, json, sha256,
  executeBusinessMasterTransition } from "./business-master-transition-lifecycle.mjs";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE_REFRESH";
export const APPLY_CONFIRMATION = "REFRESH_CANONICAL_GANOMASTER_BUSINESS_PACKAGE";

const REQUEST_ID = "CDX-20261019-003";
const SITE_ID = "ganomaster-business";
const ECOSYSTEM_TYPE = "BUSINESS";
const PUBLIC_HOST = "business.ganomaster.pro";
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const LEGACY_TEMPLATE_HASH = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const HASH = /^[0-9a-f]{64}$/;
const TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const PACKAGE_FILES = [".htaccess", ...TEMPLATE_FILES, "manifest.json"];
const exists = async (path) => access(path).then(() => true, () => false);
const NO_CACHE_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

async function loadCanonicalTemplate(templateDirectory) {
  const bytesByName = new Map();
  const files = [];
  for (const name of TEMPLATE_FILES) {
    const sourcePath = inside(templateDirectory, name);
    if ((await pathKind(sourcePath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_TEMPLATE_INVALID");
    const bytes = await readFile(sourcePath);
    bytesByName.set(name, bytes);
    files.push({ path: name, hash: sha256(bytes) });
  }
  const configText = bytesByName.get("config.js").toString("utf8");
  const config = new vm.Script(`${configText}\n;CONFIG;`).runInNewContext(Object.create(null), { timeout: 1000 });
  if (config?.ecosystemType !== ECOSYSTEM_TYPE || config?.site?.id !== SITE_ID || config?.site?.appName !== SITE_ID) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_IDENTITY_INVALID");
  }
  for (const key of ["brandName", "firstName", "fullName", "role", "whatsappNumber", "phoneNumber", "displayPhone", "ctaUrl", "defaultMessage"]) {
    if (config?.distributor?.[key] !== "") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_DISTRIBUTOR_NOT_EMPTY");
  }
  for (const key of ["primaryUrl", "secondaryUrl", "directRegisterUrl"]) {
    if (config?.cta?.[key] !== "") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_CTA_NOT_EMPTY");
  }
  if (config?.vsl?.provider !== "custom" || !String(config?.vsl?.embedUrl ?? "").endsWith(".mp4")) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_VSL_INVALID");
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files) };
}

function buildExpectedPackage(template) {
  const bytesByName = new Map(template.bytesByName);
  bytesByName.set(".htaccess", Buffer.from(NO_CACHE_HTACCESS, "utf8"));
  const manifest = {
    schemaVersion: 1,
    siteId: SITE_ID,
    ecosystemType: ECOSYSTEM_TYPE,
    publicHost: PUBLIC_HOST,
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash: template.hash,
    files: [...TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  bytesByName.set("manifest.json", Buffer.from(json(manifest), "utf8"));
  const files = [...bytesByName.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files), manifest };
}

function resolvePaths(options = {}) {
  const allowedOptions = new Set(["outputRoot", "templateDirectory", "businessJobsDirectory", "now", "testHooks", "mode", "confirmation", "expectedPlanHash", "siteId", "publicHost", "ecosystemType", "identity"]);
  if (Object.keys(options).some((key) => !allowedOptions.has(key))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARGUMENT_INVALID");
  const outputRoot = resolve(options.outputRoot ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/business");
  return {
    outputRoot,
    templateDirectory,
    destinationDirectory: inside(outputRoot, SITE_ID),
    historyJournalPath: inside(outputRoot, ".master-package-audits/CDX-20260827-002/apply.json"),
    refreshJournalPath: inside(outputRoot, ".master-package-audits/CDX-20261019-003/refresh.json"),
    archiveDirectory: inside(outputRoot, ".master-package-archives/CDX-20261019-003/ganomaster-business"),
    archiveReservationPath: inside(outputRoot, ".master-package-archives/CDX-20261019-003/ganomaster-business.reservation.json"),
    claimDirectory: inside(outputRoot, ".master-package-claims/ganomaster-business"),
    businessJobsDirectory: resolve(options.businessJobsDirectory ?? process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? "/data/generated-sites/.publication-jobs")
  };
}

function validLegacyJournal(journal, canonicalTemplateHash) {
  const expectedKeys = ["requestId", "mode", "outcome", "siteId", "planHash", "canonicalTemplateHash", "expectedPackageHash", "appliedAt"];
  if (!journal || typeof journal !== "object" || Array.isArray(journal)) return false;
  if (Object.keys(journal).sort().join("|") !== expectedKeys.sort().join("|")) return false;
  return journal.requestId === "CDX-20260827-002" &&
    journal.mode === "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE" &&
    journal.outcome === "APPLIED" &&
    journal.siteId === SITE_ID &&
    HASH.test(journal.planHash ?? "") &&
    journal.canonicalTemplateHash === canonicalTemplateHash &&
    journal.expectedPackageHash === LEGACY_PACKAGE_HASH &&
    validTimestamp(journal.appliedAt);
}

function validLegacyManifest(manifest) {
  return manifest?.schemaVersion === 1 &&
    manifest.siteId === SITE_ID &&
    manifest.ecosystemType === ECOSYSTEM_TYPE &&
    manifest.publicHost === PUBLIC_HOST &&
    manifest.source === "CANONICAL_BUSINESS_TEMPLATE" &&
    manifest.canonicalTemplateHash === LEGACY_TEMPLATE_HASH &&
    Array.isArray(manifest.files) &&
    JSON.stringify(manifest.files) === JSON.stringify([...TEMPLATE_FILES, ".htaccess", "tipografia/"]);
}

function stableBlockedReasons(reasons) {
  return [...new Set(reasons)].sort((left, right) => left.localeCompare(right));
}

async function buildPreview(options = {}, { claimOwner = null } = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  if ("siteId" in options || "publicHost" in options || "ecosystemType" in options || "identity" in options) {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_IDENTITY_OVERRIDE_FORBIDDEN");
  }
  let template = { bytesByName: new Map(), files: [], hash: "INVALID" };
  let expectedPackage = { bytesByName: new Map(), files: [], hash: "INVALID", manifest: null };
  let destination = { exists: false, files: [], hash: "ABSENT" };
  let historyBytes = null;
  let historyJournal = null;
  let activeBusinessJobs = [];
  let businessJobs = [];
  let claimPresent = false;
  let archivePresent = false;
  let refreshJournalPresent = false;
  const safeRoots = [paths.destinationDirectory, paths.historyJournalPath, paths.refreshJournalPath, paths.archiveDirectory, paths.archiveReservationPath, paths.claimDirectory];
  try {
    for (const target of safeRoots) await assertSafeAncestors(paths.outputRoot, target);
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_UNSAFE");
  }
  const businessJobsDirectoryIsSafe = isDescendant(paths.outputRoot, paths.businessJobsDirectory);
  if (!businessJobsDirectoryIsSafe) {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_DIRECTORY_OUTSIDE_OUTPUT_ROOT");
  } else {
    try {
      await assertSafeAncestors(paths.outputRoot, paths.businessJobsDirectory);
    } catch {
      reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_UNSAFE");
    }
  }
  try {
    template = await loadCanonicalTemplate(paths.templateDirectory);
    expectedPackage = buildExpectedPackage(template);
  } catch (error) {
    reasons.push(error instanceof Error && error.message.startsWith("BUSINESS_MASTER_PACKAGE_REFRESH_")
      ? error.message
      : "BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_TEMPLATE_INVALID");
  }
  try {
    destination = await inventory(paths.destinationDirectory);
    if (destination.exists && destination.hash !== LEGACY_PACKAGE_HASH) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_HASH_NOT_ALLOWLISTED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_DESTINATION_UNSAFE");
  }
  if (destination.exists && destination.hash === LEGACY_PACKAGE_HASH) {
    try {
      const expectedNames = [...PACKAGE_FILES].sort((left, right) => left.localeCompare(right));
      if (JSON.stringify(destination.files.map((file) => file.path).sort((left, right) => left.localeCompare(right))) !== JSON.stringify(expectedNames) ||
          !(await packageShapeValid(paths.destinationDirectory))) {
        reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_INVENTORY_INVALID");
      }
      const manifest = JSON.parse(await readFile(inside(paths.destinationDirectory, "manifest.json"), "utf8"));
      const installedTemplateFiles = destination.files.filter((file) => TEMPLATE_FILES.includes(file.path));
      const installedTemplateHash = inventoryHash(installedTemplateFiles);
      if (!validLegacyManifest(manifest) || installedTemplateHash !== LEGACY_TEMPLATE_HASH || manifest.canonicalTemplateHash !== installedTemplateHash) {
        reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_MANIFEST_INVALID");
      }
      if ((await pathKind(inside(paths.destinationDirectory, "tipografia"))) !== "directory") reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_TYPOGRAPHY_INVALID");
    } catch {
      reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_MANIFEST_INVALID");
    }
  }
  try {
    if ((await pathKind(paths.historyJournalPath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PREVIOUS_JOURNAL_INVALID");
    historyBytes = await readFile(paths.historyJournalPath);
    historyJournal = JSON.parse(historyBytes.toString("utf8"));
    if (!validLegacyJournal(historyJournal, LEGACY_TEMPLATE_HASH)) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_JOURNAL_INVALID");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_JOURNAL_INVALID");
  }
  if (businessJobsDirectoryIsSafe) {
    try {
      const jobState = await inspectBusinessJobs(paths.businessJobsDirectory);
      businessJobs = jobState.jobs.filter((job) => job.ecosystemType === ECOSYSTEM_TYPE);
      activeBusinessJobs = jobState.running;
      if (activeBusinessJobs.length > 0) reasons.push("BUSINESS_MASTER_PACKAGE_PUBLICATION_RUNNING");
    } catch {
      reasons.push("BUSINESS_MASTER_PACKAGE_PUBLICATION_JOB_UNCLASSIFIABLE");
    }
  }
  try {
    claimPresent = (await pathKind(paths.claimDirectory)) !== "absent";
    if (claimPresent && (!claimOwner || !(await readClaimOwner(paths.claimDirectory)) || (await assertClaimOwner(paths.claimDirectory, claimOwner).then(() => false, () => true)))) {
      reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_PRESENT");
    }
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_INVALID");
  }
  try {
    archivePresent = (await pathKind(paths.archiveDirectory)) !== "absent" || (await pathKind(paths.archiveReservationPath)) !== "absent";
    if (archivePresent) reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_OCCUPIED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_UNSAFE");
  }
  try {
    refreshJournalPresent = (await pathKind(paths.refreshJournalPath)) !== "absent";
    if (refreshJournalPresent) reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_OCCUPIED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_UNSAFE");
  }
  if (!destination.exists) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_DESTINATION_MISSING");
  const material = {
    schemaVersion: 1,
    requestId: REQUEST_ID,
    operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
    identity: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    canonicalTemplateHash: template.hash,
    canonicalTemplateFiles: template.files,
    refreshedPackageHash: expectedPackage.hash,
    refreshedPackageFiles: expectedPackage.files,
    previousPackageHash: destination.hash,
    previousPackageFiles: destination.files,
    previousJournalPath: paths.historyJournalPath,
    previousJournalHash: historyBytes ? sha256(historyBytes) : "ABSENT",
    previousJournal: historyJournal ? {
      requestId: historyJournal.requestId,
      siteId: historyJournal.siteId,
      canonicalTemplateHash: historyJournal.canonicalTemplateHash,
      expectedPackageHash: historyJournal.expectedPackageHash,
      appliedAt: historyJournal.appliedAt
    } : null,
    archivePath: paths.archiveDirectory,
    archivePresent,
    businessJobsDirectory: paths.businessJobsDirectory,
    refreshJournalPath: paths.refreshJournalPath,
    refreshJournalPresent,
    claimPresent: Boolean(claimPresent && !claimOwner),
    businessJobSnapshot: businessJobs,
    businessJobsHash: sha256(JSON.stringify(businessJobs)),
    activeBusinessJobs
  };
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: stableBlockedReasons(reasons),
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    target: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false }
  };
}

export async function planBusinessMasterPackageRefresh(options = {}) {
  return buildPreview(options);
}

export async function applyBusinessMasterPackageRefresh(options = {}) {
  if (options.mode !== APPLY_MODE) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CONFIRMATION_REQUIRED");
  if (!HASH.test(options.expectedPlanHash ?? "")) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PLAN_HASH_REQUIRED");
  const paths = resolvePaths(options);
  const preview = await buildPreview(options);
  if (preview.planHash !== options.expectedPlanHash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`BUSINESS_MASTER_PACKAGE_REFRESH_BLOCKED:${preview.blockedReasons.join(",")}`);

  return executeBusinessMasterTransition({
    options, paths, preview, requestId: REQUEST_ID, previousHash: LEGACY_PACKAGE_HASH,
    packageFiles: PACKAGE_FILES, applyMode: APPLY_MODE, operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
    buildPreview, loadCanonicalTemplate, buildExpectedPackage,
    createJournal: async ({ paths, preview, template, expected }) => {
      const historyBytes = await readFile(paths.historyJournalPath);
      const journal = {
        schemaVersion: 1,
        operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
        requestId: REQUEST_ID,
        siteId: SITE_ID,
        ecosystemType: ECOSYSTEM_TYPE,
        publicHost: PUBLIC_HOST,
        planHash: preview.planHash,
        previousPackageHash: LEGACY_PACKAGE_HASH,
        refreshedPackageHash: expected.hash,
        canonicalTemplateHash: template.hash,
        previousJournalPath: paths.historyJournalPath,
        previousJournalHash: sha256(historyBytes),
        archivePath: paths.archiveDirectory,
        archivedPackageHash: LEGACY_PACKAGE_HASH,
        appliedAt: new Date().toISOString()
      };
      return journal;
    }
  });
}

function parseArguments(argv) {
  const result = {};
  const allowed = new Set(["mode", "confirm", "expected-plan-hash"]);
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || !allowed.has(match[1])) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARGUMENT_INVALID");
    result[match[1]] = match[2];
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = (args.mode ?? "PREVIEW") === "PREVIEW"
    ? await planBusinessMasterPackageRefresh()
    : await applyBusinessMasterPackageRefresh({ mode: args.mode, confirmation: args.confirm, expectedPlanHash: args["expected-plan-hash"] });
  process.stdout.write(json(result));
  if (result.blocked) process.exitCode = 2;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error && /^BUSINESS_MASTER_PACKAGE_REFRESH_[A-Z0-9_:,-]+$/.test(error.message)
      ? error.message
      : "BUSINESS_MASTER_PACKAGE_REFRESH_FAILED_SAFELY";
    process.stderr.write(json({ error: message, providerCallsMade: false }));
    process.exitCode = 1;
  });
}
