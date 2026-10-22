// Fixed reviewed release descriptor. No user/environment profile or proof inputs.
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { inside, inventoryHash, pathKind, assertSafeAncestors, inspectBusinessJobs,
  exactKeys, validTimestamp, json, sha256, captureBusinessMasterAncestors as ancestry, captureBusinessMasterTree as tree } from "./business-master-transition-lifecycle.mjs";

export const REQUEST_ID = "CDX-20261021-009";
export const OPERATION = "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER";
export const APPLY_MODE = "APPLY_GUARDED_BUSINESS_CONSENT_MASTER_MIGRATION";
export const APPLY_CONFIRMATION = "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER";
const SITE = "ganomaster-business";
const OLD = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
const ORIGINAL = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const OLD_TEMPLATE = "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99";
const ORIGINAL_TEMPLATE = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const REVIEW = "88c003d8cbb419522c20c084dc4a019a22d33155";
const NEW_TEMPLATE = "0a7fdec9a7d51c022db7dc5d1e2eeca4cce1f1d3aea7a00ebc1cf358b1e0f63e";
const PINS = Object.freeze({
  "index.html": "39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb",
  "app.js": "fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de",
  "measurement-runtime.js": "78db567bbd5e6ab30aa9e2402bfa421aa043a7bad11ea046d56ef79df0dccf42",
  "styles.css": "302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59",
  "config.js": "ebfd341347e16651b130fb7be284326e728e17d1d793abe9877720d8e86847d0",
  "favicon.svg": "d0736575f83d7a107dd4368d1bb5b89d0baa8a3fff1ede5f4b1ea2a38151532e"
});
const FIVE = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const SIX = [...FIVE, "measurement-runtime.js"];
const PREVIOUS_FILES = [".htaccess", ...FIVE, "manifest.json"];
const PACKAGE_FILES = [".htaccess", ...SIX, "manifest.json"];
const HASH = /^[0-9a-f]{64}$/;
const PREFIX = "BUSINESS_CONSENT_MASTER_MIGRATION_";
const fail = (code) => { throw new Error(PREFIX + code); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (items) => [...items].sort((a, b) => a.localeCompare(b));
const WRITER_GATE = PREFIX + "WRITER_EXCLUSION_UNPROVEN";
const HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|measurement-runtime\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

function pathsFor(options) {
  const allowed = ["outputRoot", "templateDirectory", "businessJobsDirectory", "now", "testHooks", "mode", "confirmation", "expectedPlanHash"];
  if (Reflect.ownKeys(options).some((key) => !allowed.includes(key))) fail("ARGUMENT_INVALID");
  if (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null) fail("ARGUMENT_INVALID");
  const outputRoot = resolve(options.outputRoot ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/business");
  const businessJobsDirectory = resolve(options.businessJobsDirectory ?? process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? inside(outputRoot, ".publication-jobs"));
  const paths = { outputRoot, templateDirectory, businessJobsDirectory, destinationDirectory: inside(outputRoot, SITE),
    historyJournalPath: inside(outputRoot, ".master-package-audits/CDX-20260827-002/apply.json"),
    previousRefreshJournalPath: inside(outputRoot, ".master-package-audits/CDX-20261019-003/refresh.json"),
    previousArchiveDirectory: inside(outputRoot, ".master-package-archives/CDX-20261019-003/ganomaster-business"),
    archiveDirectory: inside(outputRoot, ".master-package-archives/CDX-20261021-009/ganomaster-business"),
    archiveReservationPath: inside(outputRoot, ".master-package-archives/CDX-20261021-009/ganomaster-business.reservation.json"),
    refreshJournalPath: inside(outputRoot, ".master-package-audits/CDX-20261021-009/migration.json"),
    claimDirectory: inside(outputRoot, ".master-package-claims/ganomaster-business"),
    siteClaimsDirectory: inside(outputRoot, ".business-publication-site-claims") };
  if (!businessJobsDirectory.startsWith(outputRoot + sep)) fail("JOB_PATH_OUTSIDE_OUTPUT_ROOT");
  if (templateDirectory === outputRoot || templateDirectory.startsWith(outputRoot + sep) || outputRoot.startsWith(templateDirectory + sep)) fail("ROOTS_OVERLAP");
  return paths;
}

function shape(value, files, directories) {
  return value.exists === true && same(value.files.map((f) => f.path), sorted(files)) && same(value.directories, sorted(directories));
}
function completePredecessorProof(value, archived) {
  if (!exactKeys(value, ["exists", "files", "directories", "nodes", "hash"]) ||
      !shape(value, PREVIOUS_FILES, ["tipografia"]) || !Array.isArray(value.nodes)) return false;
  const nodePaths = sorted(["", "tipografia", ...PREVIOUS_FILES]);
  if (!same(value.nodes.map((node) => node.path), nodePaths)) return false;
  return value.nodes.every((node) => {
    const file = PREVIOUS_FILES.includes(node.path);
    const fields = ["path", "dev", "ino", "mode", ...(file ? ["size", "mtimeNs", "ctimeNs"] : [])];
    if (!exactKeys(node, fields) || !fields.filter((key) => key !== "path").every((key) =>
      typeof node[key] === "string" && /^(?:0|[1-9][0-9]{0,31})$/.test(node[key]))) return false;
    const mode = BigInt(node.mode);
    if ((mode & 0o170000n) !== (file ? 0o100000n : 0o040000n) || (mode & ~0o177777n) !== 0n) return false;
    if (BigInt(node.dev) > 0xffffffffffffffffn || BigInt(node.ino) > 0xffffffffffffffffn) return false;
    // Copying changes physical identity and clocks, not byte lengths. Only the
    // latter can be corroborated by this unsigned, exact-content archive.
    return !file || node.size === archived.nodes.find((entry) => entry.path === node.path)?.size;
  });
}
async function journal(path) {
  await ancestry(dirname(path));
  if (await pathKind(path) !== "file") fail("JOURNAL_INVALID");
  const bytes = await readFile(path);
  return { bytes, hash: sha256(bytes), value: JSON.parse(bytes.toString()) };
}
function originalValid(j) {
  return exactKeys(j, ["requestId", "mode", "outcome", "siteId", "planHash", "canonicalTemplateHash", "expectedPackageHash", "appliedAt"]) &&
    j.requestId === "CDX-20260827-002" && j.mode === "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE" && j.outcome === "APPLIED" &&
    j.siteId === SITE && typeof j.planHash === "string" && HASH.test(j.planHash) && j.canonicalTemplateHash === ORIGINAL_TEMPLATE && j.expectedPackageHash === ORIGINAL && validTimestamp(j.appliedAt);
}
function refreshValid(j, p, originalHash) {
  return exactKeys(j, ["schemaVersion", "operation", "requestId", "siteId", "ecosystemType", "publicHost", "planHash", "previousPackageHash",
    "refreshedPackageHash", "canonicalTemplateHash", "previousJournalPath", "previousJournalHash", "archivePath", "archivedPackageHash", "appliedAt"]) &&
    j.schemaVersion === 1 && j.operation === "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE" && j.requestId === "CDX-20261019-003" &&
    j.siteId === SITE && j.ecosystemType === "BUSINESS" && j.publicHost === "business.ganomaster.pro" && typeof j.planHash === "string" && HASH.test(j.planHash) &&
    j.previousPackageHash === ORIGINAL && j.archivedPackageHash === ORIGINAL && j.refreshedPackageHash === OLD && j.canonicalTemplateHash === OLD_TEMPLATE &&
    j.previousJournalPath === p.historyJournalPath && j.previousJournalHash === originalHash && j.archivePath === p.previousArchiveDirectory && validTimestamp(j.appliedAt);
}
async function lineage(p) {
  const original = await journal(p.historyJournalPath), refresh = await journal(p.previousRefreshJournalPath);
  if (!originalValid(original.value) || !refreshValid(refresh.value, p, original.hash)) fail("LINEAGE_INVALID");
  const archive = await tree(p.previousArchiveDirectory);
  if (!shape(archive, PREVIOUS_FILES, ["tipografia"]) || archive.hash !== ORIGINAL) fail("ORIGINAL_ARCHIVE_INVALID");
  return { originalJournalHash: original.hash, refreshJournalHash: refresh.hash, archive,
    originalJournal: original.value, refreshJournal: refresh.value,
    originalProof: await tree(dirname(p.historyJournalPath)), refreshProof: await tree(dirname(p.previousRefreshJournalPath)) };
}
async function successorTemplate(path) {
  const proof = await tree(path);
  if (!shape(proof, SIX, []) || proof.hash !== NEW_TEMPLATE || proof.files.some((f) => PINS[f.path] !== f.hash)) fail("SUCCESSOR_NOT_REVIEWED_LF");
  const bytesByName = new Map();
  for (const name of SIX) {
    const bytes = await readFile(inside(path, name));
    if (bytes.includes(13) || sha256(bytes) !== PINS[name]) fail("SUCCESSOR_CAPTURE_DRIFT");
    bytesByName.set(name, bytes);
  }
  return { proof, bytesByName, files: proof.files, hash: proof.hash };
}
function expectedPackage(template) {
  const manifest = { schemaVersion: 1, siteId: SITE, ecosystemType: "BUSINESS", publicHost: "negocio.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE", canonicalTemplateHash: NEW_TEMPLATE, files: [...SIX, ".htaccess", "tipografia/"] };
  const bytesByName = new Map(template.bytesByName);
  bytesByName.set(".htaccess", Buffer.from(HTACCESS)); bytesByName.set("manifest.json", Buffer.from(json(manifest)));
  const files = [...bytesByName].map(([path, bytes]) => ({ path, hash: sha256(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  return { bytesByName, manifest, files, hash: inventoryHash(files), templateHash: NEW_TEMPLATE };
}
async function writerSnapshot(p) {
  const blockedReasons = [];
  const jobs = await tree(p.businessJobsDirectory);
  let classified = { jobs: [], running: [] };
  try { classified = await inspectBusinessJobs(p.businessJobsDirectory); } catch { blockedReasons.push(PREFIX + "JOB_UNCLASSIFIABLE"); }
  if (classified.running.length) blockedReasons.push(PREFIX + "BUSINESS_PUBLICATION_RUNNING");
  for (const entry of jobs.files) if (!entry.path.endsWith(".json") || entry.path.includes("/")) blockedReasons.push(PREFIX + "JOB_UNCLASSIFIABLE");
  if (jobs.directories.some((d) => ![".claims", ".locks"].includes(d))) blockedReasons.push(PREFIX + "JOB_CLAIM_PRESENT");
  const siteClaims = await tree(p.siteClaimsDirectory);
  if (siteClaims.files.length || siteClaims.directories.length) blockedReasons.push(PREFIX + "SITE_CLAIM_PRESENT");
  const claim = await tree(p.claimDirectory);
  if (claim.exists) blockedReasons.push(PREFIX + "CLAIM_PRESENT");
  return { jobs, classified: classified.jobs, siteClaims, claim, blockedReasons: [...new Set(blockedReasons)].sort() };
}
async function baseCapture(options, { readback = false, retainedClosure = false } = {}) {
  const paths = pathsFor(options);
  for (const [key, value] of Object.entries(paths)) {
    if (key !== "templateDirectory" && key !== "outputRoot") await assertSafeAncestors(paths.outputRoot, value);
  }
  const ancestors = { output: await ancestry(paths.outputRoot), template: await ancestry(paths.templateDirectory),
    history: await ancestry(dirname(paths.historyJournalPath)), refresh: await ancestry(dirname(paths.previousRefreshJournalPath)),
    archive: await ancestry(dirname(paths.previousArchiveDirectory)), jobs: await ancestry(dirname(paths.businessJobsDirectory)) };
  const template = await successorTemplate(paths.templateDirectory), expected = expectedPackage(template);
  const history = await lineage(paths), writers = await writerSnapshot(paths);
  // Read-only capture only. The011 connector separately proves that this exact
  // physical claim belongs to its active exclusive scope.
  if (retainedClosure) writers.blockedReasons = writers.blockedReasons.filter((reason) => reason !== PREFIX + "CLAIM_PRESENT");
  const predecessor = await tree(readback ? paths.archiveDirectory : paths.destinationDirectory);
  if (!shape(predecessor, PREVIOUS_FILES, ["tipografia"]) || predecessor.hash !== OLD) fail("PREDECESSOR_INVALID");
  if (!readback && (await pathKind(paths.archiveDirectory) !== "absent" || await pathKind(paths.archiveReservationPath) !== "absent" ||
      await pathKind(paths.refreshJournalPath) !== "absent")) fail("NEW_PATH_OCCUPIED");
  return { paths, ancestors, template, expected, history, writers, predecessor };
}

// Internal read-only building blocks; no approval or mutating009 API is added.
export async function captureBusinessConsentCutoverArtifacts(options) {
  const capture = await baseCapture(options, { retainedClosure: true });
  return { capture, material: material(capture), blockedReasons: capture.writers.blockedReasons };
}

function successorMetadata() {
  const manifest = { schemaVersion: 1, siteId: SITE, ecosystemType: "BUSINESS", publicHost: "negocio.ganomaster.pro",
    source: "CANONICAL_BUSINESS_TEMPLATE", canonicalTemplateHash: NEW_TEMPLATE, files: [...SIX, ".htaccess", "tipografia/"] };
  const files = [...Object.entries(PINS).map(([path, hash]) => ({ path, hash })),
    { path: ".htaccess", hash: sha256(HTACCESS) }, { path: "manifest.json", hash: sha256(json(manifest)) }].sort((a, b) => a.path.localeCompare(b.path));
  return { manifest, files, hash: inventoryHash(files) };
}

export function validateBusinessConsentCutoverPlan(m, metadata) {
  const successor = successorMetadata();
  if (!exactKeys(m, ["schemaVersion", "requestId", "operation", "reviewedCommit", "providers", "paths", "ancestors", "predecessor",
    "lineage", "successor", "writerSnapshot", "previousPackageFiles", "cutover"]) || m.schemaVersion !== 2 ||
    m.requestId !== REQUEST_ID || m.operation !== OPERATION || m.reviewedCommit !== REVIEW || !same(m.providers, { ga4: false, meta: false }) ||
    !exactKeys(m.cutover, ["operationId", "recordDigest", "releaseId"]) || m.cutover.operationId !== metadata.operationId ||
    m.cutover.recordDigest !== metadata.recordDigest || m.cutover.releaseId !== "business-consent-successor-v1" ||
    !same(m.paths, pathsFor({ outputRoot: metadata.outputDirectory, templateDirectory: resolve("/app/runtime-assets/business-consent-successor"),
      businessJobsDirectory: process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? inside(metadata.outputDirectory, ".publication-jobs") })) ||
    m.predecessor?.hash !== OLD || !same(m.previousPackageFiles, m.predecessor.files) ||
    !same(m.successor?.manifest, successor.manifest) || !same(m.successor?.files, successor.files) || m.successor?.hash !== successor.hash ||
    m.successor?.templateHash !== NEW_TEMPLATE || m.successor?.templateProof?.hash !== NEW_TEMPLATE ||
    !same(m.successor.templateProof.files, sorted(SIX).map((path) => ({ path, hash: PINS[path] }))) ||
    !shape(m.predecessor, PREVIOUS_FILES, ["tipografia"]) || !shape(m.lineage?.archive, PREVIOUS_FILES, ["tipografia"]) ||
    m.lineage.archive.hash !== ORIGINAL || !originalValid(m.lineage.originalJournal) ||
    !refreshValid(m.lineage.refreshJournal, m.paths, m.lineage.originalJournalHash) ||
    m.lineage.originalProof?.files?.find((file) => file.path === "apply.json")?.hash !== m.lineage.originalJournalHash ||
    m.lineage.refreshProof?.files?.find((file) => file.path === "refresh.json")?.hash !== m.lineage.refreshJournalHash ||
    !Array.isArray(m.writerSnapshot?.blockedReasons) || m.writerSnapshot.blockedReasons.some((reason) =>
      !["JOB_UNCLASSIFIABLE", "BUSINESS_PUBLICATION_RUNNING", "JOB_CLAIM_PRESENT", "SITE_CLAIM_PRESENT"].map((code) => PREFIX + code).includes(reason)) ||
    !m.writerSnapshot?.claim?.exists) throw new Error("BUSINESS_CUTOVER_PROFILE_INVALID");
  return successor;
}

export function createBusinessConsentCutoverAdapter(c, planMaterial, planHash) {
  let archiveProof, stageProof;
  const insist = (left, right) => { if (!same(left, right)) throw new Error("BUSINESS_CUTOVER_PLAN_MISMATCH"); };
  async function verifyCaptured(previousDirectory = c.paths.destinationDirectory) {
    insist(await tree(previousDirectory), previousDirectory === c.paths.archiveDirectory ? archiveProof : c.predecessor);
    // After the first rename, any present destination must still be the exact
    // staged object, including mutate/revert clocks, through journal/cleanup.
    if (previousDirectory !== c.paths.destinationDirectory && await pathKind(c.paths.destinationDirectory) !== "absent") {
      insist(await tree(c.paths.destinationDirectory), stageProof);
    }
    insist(await tree(c.paths.templateDirectory), c.template.proof);
    insist(await lineage(c.paths), c.history);
    insist(await writerSnapshot(c.paths), { ...c.writers, blockedReasons: [PREFIX + "CLAIM_PRESENT"] });
    for (const [name, path] of Object.entries({ output: c.paths.outputRoot, template: c.paths.templateDirectory,
      history: dirname(c.paths.historyJournalPath), refresh: dirname(c.paths.previousRefreshJournalPath),
      archive: dirname(c.paths.previousArchiveDirectory), jobs: dirname(c.paths.businessJobsDirectory) })) insist(await ancestry(path), c.ancestors[name]);
  }
  return {
    assertRetainedCapture: verifyCaptured,
    options: {}, paths: c.paths, preview: { planHash, planMaterial, blocked: false }, requestId: REQUEST_ID,
    previousHash: OLD, previousFiles: PREVIOUS_FILES, packageFiles: PACKAGE_FILES, applyMode: APPLY_MODE, operation: OPERATION,
    buildPreview: async () => { await verifyCaptured(); return { blocked: false, planHash }; },
    loadCanonicalTemplate: async () => { const current = await successorTemplate(c.paths.templateDirectory); insist(current.proof, c.template.proof); return current; },
    buildExpectedPackage: expectedPackage,
    assertCaptured: async ({ previousDirectory }) => {
      await verifyCaptured(previousDirectory);
      const current = await tree(c.paths.archiveDirectory);
      insist(current.files, c.predecessor.files); insist(current.directories, ["tipografia"]);
      if (archiveProof) insist(current, archiveProof); else archiveProof = current;
    },
    assertRollback: async ({ previousDirectory }) => {
      insist(await tree(previousDirectory), c.predecessor); insist(await tree(c.paths.archiveDirectory), archiveProof);
      insist(await ancestry(c.paths.outputRoot), c.ancestors.output);
    },
    captureStage: async (path) => { stageProof = await tree(path); return async (current = path) => insist(await tree(current), stageProof); },
    createJournal: () => ({ schemaVersion: 1, operation: OPERATION, requestId: REQUEST_ID, siteId: SITE,
      ecosystemType: "BUSINESS", publicHost: "negocio.ganomaster.pro", planHash, planMaterial,
      previousJournalPath: c.paths.previousRefreshJournalPath, previousJournalHash: c.history.refreshJournalHash,
      archivePath: c.paths.archiveDirectory, archivedPackageHash: OLD, successorPackageHash: c.expected.hash, appliedAt: new Date().toISOString() })
  };
}

export async function readBusinessConsentCutoverArtifacts(planMaterial, metadata) {
  const expected = validateBusinessConsentCutoverPlan(planMaterial, metadata), p = planMaterial.paths;
  for (const [key, path] of Object.entries(p)) if (key !== "templateDirectory" && key !== "outputRoot") await assertSafeAncestors(p.outputRoot, path);
  // Revalidate current ancestors, not the prior container's overlay identity.
  await ancestry(p.outputRoot);
  const outputThen = planMaterial.ancestors.output.at(-1), outputNow = (await ancestry(p.outputRoot)).at(-1);
  if (!same(outputThen, outputNow)) fail("READBACK_OUTPUT_DRIFT");
  const history = await lineage(p), archived = await tree(p.archiveDirectory), installed = await tree(p.destinationDirectory);
  const audit = await journal(p.refreshJournalPath), v = audit.value;
  if (!same(history, planMaterial.lineage) || !shape(archived, PREVIOUS_FILES, ["tipografia"]) || archived.hash !== OLD ||
    !same(archived.files, planMaterial.predecessor.files) || !shape(installed, PACKAGE_FILES, ["tipografia"]) ||
    installed.hash !== expected.hash || !same(installed.files, expected.files) ||
    await pathKind(p.archiveReservationPath) !== "absent" ||
    (await readdir(p.outputRoot)).some((name) => name.startsWith("." + SITE + ".refresh-"))) fail("READBACK_INCOMPLETE");
  const writers = await writerSnapshot(p);
  if (!same(writers.blockedReasons, [PREFIX + "CLAIM_PRESENT"]) || !same(writers.claim, planMaterial.writerSnapshot.claim)) fail("READBACK_WRITERS_BUSY");
  if (!exactKeys(v, ["schemaVersion", "operation", "requestId", "siteId", "ecosystemType", "publicHost", "planHash", "planMaterial",
    "previousJournalPath", "previousJournalHash", "archivePath", "archivedPackageHash", "successorPackageHash", "appliedAt"]) ||
    v.schemaVersion !== 1 || v.operation !== OPERATION || v.requestId !== REQUEST_ID || v.siteId !== SITE || v.ecosystemType !== "BUSINESS" ||
    v.publicHost !== "negocio.ganomaster.pro" || v.planHash !== sha256(JSON.stringify(planMaterial)) || !same(v.planMaterial, planMaterial) ||
    v.previousJournalPath !== p.previousRefreshJournalPath || v.previousJournalHash !== history.refreshJournalHash ||
    v.archivePath !== p.archiveDirectory || v.archivedPackageHash !== OLD || v.successorPackageHash !== expected.hash || !validTimestamp(v.appliedAt)) fail("READBACK_JOURNAL_INVALID");
  return { journalHash: audit.hash, packageHash: installed.hash };
}
function material(c) {
  return { schemaVersion: 1, requestId: REQUEST_ID, operation: OPERATION, reviewedCommit: REVIEW, providers: { ga4: false, meta: false },
    paths: c.paths, ancestors: c.ancestors, predecessor: c.predecessor, lineage: c.history,
    successor: { hash: c.expected.hash, files: c.expected.files, templateHash: NEW_TEMPLATE, templateProof: c.template.proof, manifest: c.expected.manifest },
    writerSnapshot: c.writers, previousPackageFiles: c.predecessor.files };
}
const safety = () => ({ providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, providers: { ga4: false, meta: false } });
export async function planBusinessConsentMasterMigration(options = {}) {
  pathsFor(options);
  let c, error;
  try { c = await baseCapture(options); } catch (e) { error = e instanceof Error && e.message.startsWith(PREFIX) ? e.message : PREFIX + "CAPTURE_INVALID"; }
  const planMaterial = c ? material(c) : { schemaVersion: 1, requestId: REQUEST_ID, operation: OPERATION, paths: pathsFor(options), captureError: error };
  const reasons = error ? [error] : [];
  const operationalReasons = [...(c?.writers.blockedReasons ?? []), WRITER_GATE];
  return { requestId: REQUEST_ID, mode: "PREVIEW", changed: false, blocked: true, blockedReasons: [...reasons, ...operationalReasons],
    artifactGate: { valid: !error, blockedReasons: reasons }, operationalGate: { writerExclusionProven: false, blockedReasons: operationalReasons },
    planHash: sha256(JSON.stringify(planMaterial)), planMaterial, safety: safety() };
}
export async function applyBusinessConsentMasterMigration(options = {}) {
  pathsFor(options);
  if (options.mode !== APPLY_MODE) fail("APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) fail("CONFIRMATION_REQUIRED");
  if (!HASH.test(options.expectedPlanHash ?? "")) fail("PLAN_HASH_REQUIRED");
  const p = await planBusinessConsentMasterMigration(options);
  if (p.planHash !== options.expectedPlanHash) fail("PLAN_HASH_MISMATCH");
  // This ticket implements no all-writer barrier. No environment, option,
  // empty-jobs observation, test hook, or file can supply this missing authority.
  fail("WRITER_EXCLUSION_UNPROVEN");
}
export async function readBusinessConsentMasterMigration(options = {}) {
  pathsFor(options);
  try {
    const c = await baseCapture(options, { readback: true }), j = await journal(c.paths.refreshJournalPath), v = j.value;
    if (c.writers.blockedReasons.length) fail("READBACK_WRITERS_BUSY");
    if (!exactKeys(v, ["schemaVersion", "operation", "requestId", "siteId", "ecosystemType", "publicHost", "planHash", "planMaterial",
      "previousJournalPath", "previousJournalHash", "archivePath", "archivedPackageHash", "successorPackageHash", "appliedAt"]) ||
        v.schemaVersion !== 1 || v.operation !== OPERATION || v.requestId !== REQUEST_ID || v.siteId !== SITE || v.ecosystemType !== "BUSINESS" ||
        v.publicHost !== "negocio.ganomaster.pro" || !HASH.test(v.planHash) || v.planHash !== sha256(JSON.stringify(v.planMaterial)) ||
        v.previousJournalPath !== c.paths.previousRefreshJournalPath || v.previousJournalHash !== c.history.refreshJournalHash ||
        v.archivePath !== c.paths.archiveDirectory || v.archivedPackageHash !== OLD || v.successorPackageHash !== c.expected.hash || !validTimestamp(v.appliedAt)) fail("READBACK_JOURNAL_INVALID");
    const m = v.planMaterial;
    if (!same(Object.keys(m).sort(), ["schemaVersion", "requestId", "operation", "reviewedCommit", "providers", "paths", "ancestors",
      "predecessor", "lineage", "successor", "writerSnapshot", "previousPackageFiles"].sort()) ||
        m.requestId !== REQUEST_ID || m.operation !== OPERATION || m.reviewedCommit !== REVIEW || m.schemaVersion !== 1 ||
        !same(m.paths, c.paths) || !same(m.providers, { ga4: false, meta: false }) || !same(m.lineage, c.history) ||
        m.predecessor?.hash !== OLD || !completePredecessorProof(m.predecessor, c.predecessor) ||
        !same(m.predecessor.files, c.predecessor.files) || !same(m.previousPackageFiles, c.predecessor.files) ||
        !same(m.successor, material(c).successor) || !same(m.writerSnapshot, c.writers) || !same(m.ancestors, c.ancestors)) fail("READBACK_PLAN_INVALID");
    const installed = await tree(c.paths.destinationDirectory);
    if (!shape(installed, PACKAGE_FILES, ["tipografia"]) || installed.hash !== c.expected.hash ||
        await pathKind(c.paths.archiveReservationPath) !== "absent" ||
        (await readdir(c.paths.outputRoot)).some((name) => name.startsWith("." + SITE + ".refresh-"))) fail("READBACK_INCOMPLETE");
    return { requestId: REQUEST_ID, mode: "READBACK", outcome: "ALREADY_APPLIED", changed: false, blocked: false, blockedReasons: [],
      artifactGate: { valid: true, blockedReasons: [] }, operationalGate: { writerExclusionProven: false, blockedReasons: [WRITER_GATE] },
      planHash: v.planHash, planMaterial: m, safety: safety() };
  } catch (e) {
    return { requestId: REQUEST_ID, mode: "READBACK", outcome: "BLOCKED", changed: false, blocked: true,
      blockedReasons: [e instanceof Error && e.message.startsWith(PREFIX) ? e.message : PREFIX + "READBACK_INVALID"],
      planHash: null, planMaterial: null, artifactGate: { valid: false, blockedReasons: [PREFIX + "READBACK_INCOMPLETE"] },
      operationalGate: { writerExclusionProven: false, blockedReasons: [WRITER_GATE] }, safety: safety() };
  }
}
