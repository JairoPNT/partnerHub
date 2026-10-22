import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import {
  APPLY_MODE, APPLY_CONFIRMATION, planBusinessConsentMasterMigration,
  readBusinessConsentMasterMigration, applyBusinessConsentMasterMigration
} from "./business-consent-master-package-migration.mjs";
import { executeBusinessMasterTransition, assertClaimOwner, captureBusinessMasterTree as captureTree,
  captureBusinessMasterAncestors as captureAncestors } from "./business-master-transition-lifecycle.mjs";
import * as releaseModule from "./business-consent-master-release.mjs";

const ROOT = resolve(import.meta.dirname, "../../..");
const ID = "CDX-20261021-009";
const SITE = "ganomaster-business";
const OLD = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
const ORIGINAL = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const REVIEW = "88c003d8cbb419522c20c084dc4a019a22d33155";
const ORIGINAL_TEMPLATE = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const OLD_TEMPLATE = "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99";
const NEW_TEMPLATE = "0a7fdec9a7d51c022db7dc5d1e2eeca4cce1f1d3aea7a00ebc1cf358b1e0f63e";
const FIVE = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const SIX = [...FIVE, "measurement-runtime.js"];
const H = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const invHash = (entries) => H(JSON.stringify(entries.sort((a, b) => a.path.localeCompare(b.path))));
const git = (commit, path) => execFileSync("git", ["show", `${commit}:${path}`], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
const assets = (commit, names) => new Map(names.map((n) => [n, git(commit, `plantillas-de-pagina/business/${n}`)]));
const originalAssets = assets("16afb035f971b4495adb07983222f3461f87312c", FIVE);
const oldAssets = assets("a8d547c1cf9d754573bf20eb5cc154a03f9f5c60", FIVE);
const newAssets = assets(REVIEW, SIX);
const HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;
function packageOf(bytes, host = "business.ganomaster.pro") {
  const names = [...bytes.keys()].sort((a, b) => a.localeCompare(b));
  const templateHash = invHash(names.map((path) => ({ path, hash: H(bytes.get(path)) })));
  const manifest = { schemaVersion: 1, siteId: SITE, ecosystemType: "BUSINESS", publicHost: host,
    source: "CANONICAL_BUSINESS_TEMPLATE", canonicalTemplateHash: templateHash,
    files: [...FIVE, ...(bytes.has("measurement-runtime.js") ? ["measurement-runtime.js"] : []), ".htaccess", "tipografia/"] };
  const result = new Map(bytes);
  result.set(".htaccess", Buffer.from(bytes.has("measurement-runtime.js") ? HTACCESS.replace("app\\.js|", "app\\.js|measurement-runtime\\.js|") : HTACCESS));
  result.set("manifest.json", Buffer.from(json(manifest)));
  return { bytes: result, templateHash, hash: invHash([...result].map(([path, b]) => ({ path, hash: H(b) }))), manifest };
}
const original = packageOf(originalAssets);
const old = packageOf(oldAssets);
const successor = packageOf(newAssets, "negocio.ganomaster.pro");
async function savePackage(path, pkg) {
  await mkdir(join(path, "tipografia"), { recursive: true });
  for (const [name, bytes] of pkg.bytes) await writeFile(join(path, name), bytes);
}
async function snapshot(path) {
  const items = [];
  async function visit(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name), name = relative(path, p).split(sep).join("/");
      if (e.isDirectory()) { items.push({ path: name, kind: "directory" }); await visit(p); }
      else if (e.isFile()) items.push({ path: name, hash: H(await readFile(p)) });
      else items.push({ path: name, kind: "special" });
    }
  }
  await visit(path);
  return items.sort((a, b) => a.path.localeCompare(b.path));
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "partnerhub-consent-migration-"));
  const outputRoot = join(root, "output"), templateDirectory = join(root, "template");
  const businessJobsDirectory = join(outputRoot, ".publication-jobs");
  await mkdir(businessJobsDirectory, { recursive: true }); await mkdir(templateDirectory);
  for (const [name, bytes] of newAssets) await writeFile(join(templateDirectory, name), bytes);
  await savePackage(join(outputRoot, SITE), old);
  const applyPath = join(outputRoot, ".master-package-audits/CDX-20260827-002/apply.json");
  const refreshPath = join(outputRoot, ".master-package-audits/CDX-20261019-003/refresh.json");
  const archivePath = join(outputRoot, ".master-package-archives/CDX-20261019-003", SITE);
  const originalJournal = { requestId: "CDX-20260827-002", mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE", outcome: "APPLIED", siteId: SITE,
    planHash: "a".repeat(64), canonicalTemplateHash: ORIGINAL_TEMPLATE, expectedPackageHash: ORIGINAL, appliedAt: "2026-08-27T19:30:00.000Z" };
  const applyBytes = Buffer.from(json(originalJournal));
  const refreshJournal = { schemaVersion: 1, operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE", requestId: "CDX-20261019-003", siteId: SITE,
    ecosystemType: "BUSINESS", publicHost: "business.ganomaster.pro", planHash: "b".repeat(64), previousPackageHash: ORIGINAL,
    refreshedPackageHash: OLD, canonicalTemplateHash: OLD_TEMPLATE, previousJournalPath: applyPath, previousJournalHash: H(applyBytes),
    archivePath, archivedPackageHash: ORIGINAL, appliedAt: "2026-10-19T19:30:00.000Z" };
  for (const [path, bytes] of [[applyPath, applyBytes], [refreshPath, json(refreshJournal)]]) {
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes);
  }
  await savePackage(archivePath, original);
  return { root, outputRoot, templateDirectory, businessJobsDirectory, applyPath, refreshPath, archivePath, refreshJournal,
    options: { outputRoot, templateDirectory, businessJobsDirectory }, cleanup: () => rm(root, { recursive: true, force: true }) };
}
const authorize = (item, plan, extra = {}) => applyBusinessConsentMasterMigration({ ...item.options,
  mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: plan.planHash, ...extra });
const exists = (path) => access(path).then(() => true, () => false);
const claim = (f) => join(f.outputRoot, ".master-package-claims", SITE);
const newJournal = (f) => join(f.outputRoot, ".master-package-audits", ID, "migration.json");
const newArchive = (f) => join(f.outputRoot, ".master-package-archives", ID, SITE);
process.env.NODE_ENV = "test";

// Mechanical rehearsal calls the internal primitive, never the public APPLY.
// This helper and its disposable roots do not ship in the production bundle.
async function mechanical(f, testHooks = {}) {
  const p = await planBusinessConsentMasterMigration(f.options);
  assert.equal(p.artifactGate.valid, true, JSON.stringify(p.blockedReasons));
  assert.deepEqual(p.blockedReasons, ["BUSINESS_CONSENT_MASTER_MIGRATION_WRITER_EXCLUSION_UNPROVEN"], JSON.stringify(p.blockedReasons));
  const m = p.planMaterial;
  let ownedClaim, archiveProof;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const insist = (a, b) => { if (!equal(a, b)) throw new Error("FIXTURE_CAPTURE_DRIFT"); };
  // Only comparisons of captured evidence, not a second release-policy validator.
  async function verifyCaptured(previousDirectory = m.paths.destinationDirectory) {
    await assertClaimOwner(m.paths.claimDirectory, ownedClaim);
    const owner = JSON.parse(await readFile(join(m.paths.claimDirectory, "owner.json")));
    assert.deepEqual(Object.keys(owner).sort(), ["schemaVersion", "operation", "ownerToken", "planHash", "acquiredAt"].sort());
    insist(await captureTree(previousDirectory), m.predecessor);
    insist(await captureTree(m.paths.templateDirectory), m.successor.templateProof);
    insist(await captureTree(dirname(m.paths.historyJournalPath)), m.lineage.originalProof);
    insist(await captureTree(dirname(m.paths.previousRefreshJournalPath)), m.lineage.refreshProof);
    insist(await captureTree(m.paths.previousArchiveDirectory), m.lineage.archive);
    insist(await captureTree(m.paths.businessJobsDirectory), m.writerSnapshot.jobs);
    insist(await captureTree(m.paths.siteClaimsDirectory), m.writerSnapshot.siteClaims);
    for (const [key, path] of Object.entries({ output: m.paths.outputRoot, template: m.paths.templateDirectory,
      history: dirname(m.paths.historyJournalPath), refresh: dirname(m.paths.previousRefreshJournalPath),
      archive: dirname(m.paths.previousArchiveDirectory), jobs: dirname(m.paths.businessJobsDirectory) })) {
      insist(await captureAncestors(path), m.ancestors[key]);
    }
  }
  const adapter = {
    options: { ...f.options, testHooks }, paths: m.paths,
    preview: { ...p, blocked: false, blockedReasons: [] },
    requestId: ID, previousHash: OLD, previousFiles: [".htaccess", ...FIVE, "manifest.json"],
    packageFiles: [".htaccess", ...SIX, "manifest.json"], applyMode: APPLY_MODE, operation: releaseModule.OPERATION,
    buildPreview: async (_options, { claimOwner }) => {
      ownedClaim ??= claimOwner; await verifyCaptured();
      return { blocked: false, planHash: p.planHash };
    },
    loadCanonicalTemplate: async () => {
      insist(await captureTree(f.templateDirectory), m.successor.templateProof);
      return { hash: NEW_TEMPLATE, bytesByName: new Map(newAssets) };
    },
    buildExpectedPackage: () => ({ bytesByName: new Map(successor.bytes), hash: successor.hash }),
    assertCaptured: async ({ previousDirectory }) => {
      await verifyCaptured(previousDirectory);
      const current = await captureTree(m.paths.archiveDirectory);
      insist(current.files, m.predecessor.files); insist(current.directories, ["tipografia"]);
      if (archiveProof) insist(current, archiveProof); else archiveProof = current;
    },
    assertRollback: async ({ previousDirectory }) => {
      await assertClaimOwner(m.paths.claimDirectory, ownedClaim);
      insist(await captureTree(previousDirectory), m.predecessor);
      insist(await captureTree(m.paths.archiveDirectory), archiveProof);
      insist(await captureAncestors(m.paths.outputRoot), m.ancestors.output);
    },
    captureStage: async (path) => {
      const proof = await captureTree(path);
      return async (current = path) => insist(await captureTree(current), proof);
    },
    createJournal: () => ({ schemaVersion: 1, operation: releaseModule.OPERATION, requestId: ID, siteId: SITE,
      ecosystemType: "BUSINESS", publicHost: "negocio.ganomaster.pro", planHash: p.planHash, planMaterial: m,
      previousJournalPath: m.paths.previousRefreshJournalPath, previousJournalHash: m.lineage.refreshJournalHash,
      archivePath: m.paths.archiveDirectory, archivedPackageHash: OLD, successorPackageHash: successor.hash,
      appliedAt: "2026-10-21T23:00:00.000Z" })
  };
  return executeBusinessMasterTransition(adapter);
}

test("production release exports no current-profile capture or installation adapter", () => {
  assert.deepEqual(Object.keys(releaseModule).sort(), ["APPLY_CONFIRMATION", "APPLY_MODE", "OPERATION", "REQUEST_ID",
    "applyBusinessConsentMasterMigration", "planBusinessConsentMasterMigration", "readBusinessConsentMasterMigration"].sort());
});

test("Git fixture really reconstructs known historical packages and actual reviewed registry bytes", () => {
  assert.equal(original.hash, ORIGINAL); assert.equal(original.templateHash, ORIGINAL_TEMPLATE);
  assert.equal(old.hash, OLD); assert.equal(old.templateHash, OLD_TEMPLATE);
  assert.equal(successor.templateHash, NEW_TEMPLATE);
  const registry = git(REVIEW, "app/web/server/services/businessMeasurementArtifacts.ts").toString();
  for (const [key, file] of [["indexHtmlSha256", "index.html"], ["appJsSha256", "app.js"], ["runtimeSha256", "measurement-runtime.js"], ["stylesSha256", "styles.css"]]) {
    assert.equal(registry.match(new RegExp(`${key}:\\s*'([0-9a-f]{64})'`))?.[1], H(newAssets.get(file)));
  }
  assert.match(registry, /ga4: false, meta: false/);
  for (const bytes of newAssets.values()) assert.equal(bytes.includes(13), false);
});
test("PREVIEW certifies exact lineage and successor bytes separately from unproven writer exclusion, without writes", async () => {
  const f = await fixture();
  try {
    const before = await snapshot(f.root), p = await planBusinessConsentMasterMigration(f.options);
    assert.deepEqual(p, await planBusinessConsentMasterMigration(f.options));
    assert.equal(p.requestId, ID); assert.equal(p.changed, false); assert.equal(p.mode, "PREVIEW");
    assert.equal(p.artifactGate.valid, true); assert.deepEqual(p.artifactGate.blockedReasons, []);
    assert.equal(p.operationalGate.writerExclusionProven, false);
    assert.deepEqual(p.blockedReasons, ["BUSINESS_CONSENT_MASTER_MIGRATION_WRITER_EXCLUSION_UNPROVEN"]);
    assert.equal(p.planMaterial.predecessor.hash, OLD); assert.equal(p.planMaterial.successor.hash, successor.hash);
    assert.equal(p.planMaterial.successor.manifest.publicHost, "negocio.ganomaster.pro");
    assert.equal(p.planMaterial.successor.templateHash, NEW_TEMPLATE);
    assert.equal(p.planMaterial.lineage.originalJournalHash, H(await readFile(f.applyPath)));
    assert.equal(p.planMaterial.lineage.refreshJournalHash, H(await readFile(f.refreshPath)));
    assert.equal(p.planMaterial.lineage.archive.hash, ORIGINAL);
    assert.equal(p.safety.providerCallsMade, false); assert.equal(p.safety.localWritesMade, false);
    assert.deepEqual(await snapshot(f.root), before);
    await assert.rejects(authorize(f, p), /WRITER_EXCLUSION_UNPROVEN/);
    assert.deepEqual(await snapshot(f.root), before);
  } finally { await f.cleanup(); }
});
test("artifact certification is separate from observed running writers and blocked readback keeps both gates", async () => {
  const f = await fixture();
  try {
    const job = runningJob(); await writeFile(join(f.businessJobsDirectory, job.id + ".json"), json(job));
    const p = await planBusinessConsentMasterMigration(f.options);
    assert.equal(p.artifactGate.valid, true);
    assert.ok(p.operationalGate.blockedReasons.some((r) => r.endsWith("BUSINESS_PUBLICATION_RUNNING")));
    const rb = await readBusinessConsentMasterMigration(f.options);
    assert.equal(rb.blocked, true); assert.equal(rb.artifactGate.valid, false);
    assert.equal(rb.operationalGate.writerExclusionProven, false);
    assert.equal(rb.planHash, null); assert.equal(rb.planMaterial, null);
  } finally { await f.cleanup(); }
});

test("CLI read-only staged candidate selector never overrides fixed release or enables APPLY", async () => {
  const f = await fixture();
  try {
    const env = { ...process.env, PRODUCT_PAGE_OUTPUT_DIR: f.outputRoot, PRODUCT_PAGE_PUBLICATION_JOB_DIR: f.businessJobsDirectory };
    const run = (args) => spawnSync(process.execPath, [join(ROOT, "app/web/scripts/business-consent-master-package-migration.mjs"), ...args],
      { env, cwd: f.root, encoding: "utf8", timeout: 30000 });
    const before = await snapshot(f.root), preview = run(["--template-dir=" + f.templateDirectory]);
    assert.equal(preview.status, 2, preview.stderr);
    const p = JSON.parse(preview.stdout);
    assert.equal(p.artifactGate.valid, true); assert.equal(p.operationalGate.writerExclusionProven, false);
    assert.equal(p.planMaterial.paths.templateDirectory, f.templateDirectory);
    const readback = run(["--mode=READBACK", "--template-dir=" + f.templateDirectory]);
    assert.equal(readback.status, 2); assert.equal(JSON.parse(readback.stdout).outcome, "BLOCKED");
    const refused = run(["--mode=" + APPLY_MODE, "--template-dir=" + f.templateDirectory,
      "--confirm=" + APPLY_CONFIRMATION, "--expected-plan-hash=" + p.planHash]);
    assert.equal(refused.status, 1); assert.match(JSON.parse(refused.stderr).error, /READ_ONLY_ARGUMENT/);
    assert.deepEqual(await snapshot(f.root), before);
  } finally { await f.cleanup(); }
});
for (const defect of ["missing-original", "missing-refresh", "missing-archive", "extra-refresh-field", "wrong-refresh-hash", "wrong-refresh-host", "wrong-refresh-path", "extra-empty-directory", "wrong-successor", "crlf-successor"]) {
  test(`artifact gate rejects ${defect}`, async () => {
    const f = await fixture();
    try {
      if (defect === "missing-original") await rm(f.applyPath);
      else if (defect === "missing-refresh") await rm(f.refreshPath);
      else if (defect === "missing-archive") await rm(f.archivePath, { recursive: true });
      else if (defect === "extra-empty-directory") await mkdir(join(f.outputRoot, SITE, "hidden-empty"));
      else if (defect === "wrong-successor") await writeFile(join(f.templateDirectory, "config.js"), "bad");
      else if (defect === "crlf-successor") await writeFile(join(f.templateDirectory, "app.js"), newAssets.get("app.js").toString().replaceAll("\n", "\r\n"));
      else {
        const j = { ...f.refreshJournal };
        if (defect === "extra-refresh-field") j.outcome = "APPLIED";
        if (defect === "wrong-refresh-hash") j.previousJournalHash = "f".repeat(64);
        if (defect === "wrong-refresh-host") j.publicHost = "negocio.ganomaster.pro";
        if (defect === "wrong-refresh-path") j.archivePath += "-forged";
        await writeFile(f.refreshPath, json(j));
      }
      const before = await snapshot(f.root), p = await planBusinessConsentMasterMigration(f.options);
      assert.equal(p.artifactGate.valid, false); assert.equal(p.blocked, true);
      await assert.rejects(authorize(f, p)); assert.deepEqual(await snapshot(f.root), before);
      assert.notEqual((await readBusinessConsentMasterMigration(f.options)).outcome, "ALREADY_APPLIED");
    } finally { await f.cleanup(); }
  });
}

test("shared transaction mechanically archives 9760, installs exact LF consent release and validates complete readback", async () => {
  const f = await fixture();
  try {
    const historical = await snapshot(join(f.outputRoot, ".master-package-audits/CDX-20261019-003"));
    const originalJournal = await readFile(f.applyPath), originalArchive = await snapshot(f.archivePath);
    const p = await planBusinessConsentMasterMigration(f.options), result = await mechanical(f);
    assert.equal(result.changed, true); assert.equal(result.outcome, "APPLIED");
    assert.deepEqual(await snapshot(join(f.outputRoot, SITE)), await (async () => {
      const expected = join(f.root, "expected"); await savePackage(expected, successor); return snapshot(expected);
    })());
    const archived = await readFile(join(newArchive(f), "manifest.json"), "utf8");
    assert.equal(JSON.parse(archived).publicHost, "business.ganomaster.pro");
    assert.deepEqual(await snapshot(newArchive(f)), await (async () => {
      const expected = join(f.root, "expected-old"); await savePackage(expected, old); return snapshot(expected);
    })());
    assert.deepEqual(await readFile(f.applyPath), originalJournal);
    assert.deepEqual(await snapshot(f.archivePath), originalArchive);
    assert.deepEqual(await snapshot(dirname(f.refreshPath)), historical);
    const j = JSON.parse(await readFile(newJournal(f), "utf8"));
    assert.equal(j.planHash, p.planHash); assert.equal(j.previousJournalHash, H(await readFile(f.refreshPath)));
    assert.equal(j.previousJournalPath, f.refreshPath); assert.equal(j.archivedPackageHash, OLD);
    assert.equal(await exists(claim(f)), false);
    const rb = await readBusinessConsentMasterMigration(f.options);
    assert.equal(rb.outcome, "ALREADY_APPLIED"); assert.equal(rb.planHash, p.planHash);
    assert.equal(rb.operationalGate.writerExclusionProven, false);
    assert.deepEqual(rb, await readBusinessConsentMasterMigration(f.options));
  } finally { await f.cleanup(); }
});

for (const phase of ["afterClaim", "afterStageVerified", "afterPreviousBackupAbsentCheck", "afterArchive", "afterInstall", "beforeJournalCommit", "beforeCleanup"]) {
  test(`failure at ${phase} preserves predecessor before install and recovery evidence after mutation`, async () => {
    const f = await fixture();
    try {
      await assert.rejects(mechanical(f, { [phase]: () => { throw new Error("INJECTED"); } }), /INJECTED/);
      const afterInstall = ["afterInstall", "beforeJournalCommit", "beforeCleanup"].includes(phase);
      assert.equal(JSON.parse(await readFile(join(f.outputRoot, SITE, "manifest.json"))).publicHost,
        afterInstall ? "negocio.ganomaster.pro" : "business.ganomaster.pro");
      assert.equal(await exists(claim(f)), !["afterClaim", "afterStageVerified"].includes(phase));
      assert.notEqual((await readBusinessConsentMasterMigration(f.options)).outcome, "ALREADY_APPLIED");
    } finally { await f.cleanup(); }
  });
}

for (const defect of ["successor-revert", "predecessor-revert", "lineage-revert", "staged-revert", "extra-stage-dir", "extra-archive-dir", "job-after-archive", "lineage-after-archive", "owner-loss", "foreign-journal", "foreign-destination", "replaced-ancestor"]) {
  test(`mechanical lifecycle fails closed for ${defect}`, async () => {
    const f = await fixture();
    try {
      const revert = async (path) => { const bytes = await readFile(path); await writeFile(path, "changed"); await writeFile(path, bytes); };
      const hooks = {};
      if (defect === "successor-revert") hooks.afterStageVerified = () => revert(join(f.templateDirectory, "app.js"));
      if (defect === "predecessor-revert") hooks.afterStageVerified = () => revert(join(f.outputRoot, SITE, "config.js"));
      if (defect === "lineage-revert") hooks.afterStageVerified = () => revert(f.refreshPath);
      if (defect === "staged-revert") hooks.afterStageVerified = ({ stageDirectory }) => revert(join(stageDirectory, "package/app.js"));
      if (defect === "extra-stage-dir") hooks.afterStageVerified = ({ stageDirectory }) => mkdir(join(stageDirectory, "package/hidden"));
      if (defect === "extra-archive-dir") hooks.afterArchive = ({ archiveDirectory }) => mkdir(join(archiveDirectory, "hidden"));
      if (defect === "job-after-archive") hooks.afterArchive = () => writeFile(join(f.businessJobsDirectory, "broken.json"), "{}");
      if (defect === "lineage-after-archive") hooks.afterArchive = () => writeFile(f.refreshPath, json({ ...f.refreshJournal, outcome: "APPLIED" }));
      if (defect === "owner-loss") hooks.afterArchive = async () => {
        const path = join(claim(f), "owner.json"), owner = JSON.parse(await readFile(path)); owner.ownerToken = "11111111-1111-4111-8111-111111111111";
        await writeFile(path, json(owner));
      };
      if (defect === "foreign-journal") hooks.beforeJournalCommit = async () => {
        await mkdir(dirname(newJournal(f)), { recursive: true }); await writeFile(newJournal(f), "foreign");
      };
      if (defect === "foreign-destination") hooks.afterArchive = () => mkdir(join(f.outputRoot, SITE));
      if (defect === "replaced-ancestor") hooks.afterArchive = async () => {
        const parent = dirname(f.refreshPath); await rename(parent, parent + "-replaced"); await mkdir(parent);
        await writeFile(f.refreshPath, json(f.refreshJournal));
      };
      await assert.rejects(mechanical(f, hooks));
      if (defect === "extra-archive-dir") {
        assert.equal(await exists(join(f.outputRoot, SITE)), false, "do not install successor or restore from uncertain archive proof");
        const backup = (await readdir(f.outputRoot)).find((name) => name.endsWith(".previous"));
        assert.ok(backup); assert.equal(await exists(claim(f)), true);
        assert.equal(invHash((await snapshot(join(f.outputRoot, backup))).filter((entry) => entry.hash)), OLD,
          "retain exact predecessor bytes in owned backup for explicit recovery");
      }
      assert.notEqual((await readBusinessConsentMasterMigration(f.options)).outcome, "ALREADY_APPLIED");
      if (defect === "foreign-journal") assert.equal(await readFile(newJournal(f), "utf8"), "foreign");
      if (defect === "foreign-destination") assert.deepEqual(await readdir(join(f.outputRoot, SITE)), []);
    } finally { await f.cleanup(); }
  });
}

test("mechanical concurrent claim is exclusive", async () => {
  const f = await fixture();
  try {
    let entered, resume;
    const ready = new Promise((r) => { entered = r; }), wait = new Promise((r) => { resume = r; });
    const first = mechanical(f, { afterClaim: async () => { entered(); await wait; } });
    await ready;
    try { await assert.rejects(mechanical(f), /CLAIM_PRESENT/); } finally { resume(); }
    assert.equal((await first).changed, true);
  } finally { await f.cleanup(); }
});

test("installed successor capture-mutate-revert cannot commit an audit or success", async () => {
  const f = await fixture();
  try {
    await assert.rejects(mechanical(f, { beforeJournalCommit: async ({ destinationDirectory }) => {
      const path = join(destinationDirectory, "app.js"), bytes = await readFile(path);
      await writeFile(path, "changed"); await writeFile(path, bytes);
    } }));
    assert.equal(await exists(newJournal(f)), false); assert.equal(await exists(claim(f)), true);
  } finally { await f.cleanup(); }
});

for (const defect of ["removed", "replaced-identical", "mutated", "mutate-revert", "parent-replaced"]) {
  test(`F1 committed journal ${defect} retains backup and claim instead of success`, async () => {
    const f = await fixture();
    try {
      let foreignBytes;
      await assert.rejects(mechanical(f, { beforeCleanup: async () => {
        const path = newJournal(f), bytes = await readFile(path);
        if (defect === "removed") await rm(path);
        if (defect === "replaced-identical") { await rename(path, path + ".displaced"); await writeFile(path, bytes); }
        if (defect === "mutated") await writeFile(path, "foreign journal after committed link");
        if (defect === "mutate-revert") { await writeFile(path, "transient foreign bytes"); await writeFile(path, bytes); }
        if (defect === "parent-replaced") { await rename(dirname(path), dirname(path) + ".displaced"); await mkdir(dirname(path)); await writeFile(path, bytes); }
        foreignBytes = await exists(path) ? await readFile(path) : null;
      } }), /JOURNAL.*PROOF|RECOVERY.*DRIFT/);
      assert.equal(await exists(claim(f)), true);
      const backup = (await readdir(f.outputRoot)).find((name) => name.endsWith(".previous"));
      assert.ok(backup); assert.equal(invHash((await snapshot(join(f.outputRoot, backup))).filter((entry) => entry.hash)), OLD);
      if (foreignBytes) assert.deepEqual(await readFile(newJournal(f)), foreignBytes);
      else assert.equal(await exists(newJournal(f)), false);
      assert.equal((await readBusinessConsentMasterMigration(f.options)).outcome, "BLOCKED");
    } finally { await f.cleanup(); }
  });
}

for (const [resource, defect, phase] of [
  ["claim", "directory-replaced", "afterClaim"],
  ["claim", "file-replaced", "beforeCleanup"],
  ["claim", "directory-replaced", "beforeCleanup"],
  ["claim", "mutate-revert", "afterClaim"],
  ["claim", "mutate-revert", "beforeCleanup"],
  ["claim", "parent-replaced", "afterClaim"],
  ["claim", "parent-replaced", "beforeCleanup"],
  ["reservation", "file-replaced", "afterPreviousBackupAbsentCheck"],
  ["reservation", "file-replaced", "afterArchive"],
  ["reservation", "file-replaced", "beforeCleanup"],
  ["reservation", "mutate-revert", "afterArchive"],
  ["reservation", "mutate-revert", "beforeCleanup"],
  ["reservation", "parent-replaced", "beforeCleanup"]
]) {
  test(`F2 ${resource} ${defect} at ${phase} cannot consume foreign ownership objects`, async () => {
    const f = await fixture();
    try {
      let markerPath, markerBytes;
      await assert.rejects(mechanical(f, { [phase]: async () => {
        markerPath = resource === "claim" ? join(claim(f), "owner.json") : newArchive(f) + ".reservation.json";
        markerBytes = await readFile(markerPath);
        if (defect === "file-replaced") {
          await rename(markerPath, resource === "claim" ? claim(f) + ".owner-displaced" : markerPath + ".displaced");
          await writeFile(markerPath, markerBytes);
        }
        if (defect === "directory-replaced") { await rename(claim(f), claim(f) + ".displaced"); await mkdir(claim(f)); await writeFile(markerPath, markerBytes); }
        if (defect === "mutate-revert") { await writeFile(markerPath, "transient foreign bytes"); await writeFile(markerPath, markerBytes); }
        if (defect === "parent-replaced") {
          const parent = resource === "claim" ? dirname(claim(f)) : dirname(markerPath), displaced = parent + ".displaced";
          await rename(parent, displaced); await mkdir(parent);
          // Move the acquired objects intact: only their ancestor identity changes.
          if (resource === "claim") await rename(join(displaced, SITE), claim(f));
          else {
            await rename(join(displaced, SITE), newArchive(f));
            await rename(join(displaced, SITE + ".reservation.json"), markerPath);
          }
        }
      } }), /OWNERSHIP|RESERVATION|PROOF|DRIFT/);
      assert.deepEqual(await readFile(markerPath), markerBytes);
      assert.equal(await exists(claim(f)), true, "retain ownership evidence; never delete the replacement");
      if (phase !== "afterClaim") {
        const backups = (await readdir(f.outputRoot)).filter((name) => name.endsWith(".previous"));
        if (phase === "afterPreviousBackupAbsentCheck") assert.equal(backups.length, 0);
        else {
          assert.equal(backups.length, 1);
          assert.equal(invHash((await snapshot(join(f.outputRoot, backups[0]))).filter((entry) => entry.hash)), OLD);
        }
      }
      if (phase === "afterArchive") assert.equal(await exists(join(f.outputRoot, SITE)), false, "uncertain ownership must not trigger rollback");
    } finally { await f.cleanup(); }
  });
}

test("F2 copied staging owner cannot delete foreign stage or consume backup during cleanup", async () => {
  const f = await fixture();
  try {
    let stagedPath, markerBytes;
    await assert.rejects(mechanical(f, {
      afterStageVerified: async ({ stageDirectory }) => { stagedPath = stageDirectory; },
      beforeCleanup: async () => {
        markerBytes = await readFile(join(stagedPath, "owner.json"));
        await rename(stagedPath, stagedPath + ".displaced"); await mkdir(stagedPath);
        await writeFile(join(stagedPath, "owner.json"), markerBytes);
      }
    }), /STAGING.*OWNERSHIP|PROOF|DRIFT/);
    assert.deepEqual(await readFile(join(stagedPath, "owner.json")), markerBytes);
    assert.equal((await readdir(f.outputRoot)).filter((name) => name.endsWith(".previous")).length, 1);
    assert.equal(await exists(claim(f)), true);
  } finally { await f.cleanup(); }
});

for (const field of ["planHash", "previousJournalHash"]) {
  test(`lineage rejects non-string ${field} even when hash coercion would match`, async () => {
    const f = await fixture();
    try {
      const path = field === "planHash" ? f.applyPath : f.refreshPath;
      const value = JSON.parse(await readFile(path)); value[field] = [value[field]];
      await writeFile(path, json(value));
      // Keep the linkage coherent: failure must be the writer schema, not stale linkage.
      if (field === "planHash") await writeFile(f.refreshPath, json({ ...f.refreshJournal, previousJournalHash: H(await readFile(path)) }));
      assert.equal((await planBusinessConsentMasterMigration(f.options)).artifactGate.valid, false);
    } finally { await f.cleanup(); }
  });
}

for (const defect of ["backup-extra-dir", "archive-revert", "claim-extra-field", "cleanup-installed-revert"]) {
  test(`recovery proof cannot be weakened by ${defect}`, async () => {
    const f = await fixture();
    try {
      const hooks = {};
      if (defect === "backup-extra-dir") hooks.afterArchive = async () => {
        const name = (await readdir(f.outputRoot)).find((n) => n.endsWith(".previous"));
        await mkdir(join(f.outputRoot, name, "unexpected")); throw new Error("INJECTED");
      };
      if (defect === "archive-revert") hooks.afterArchive = async ({ archiveDirectory }) => {
        const path = join(archiveDirectory, "app.js"), bytes = await readFile(path);
        await writeFile(path, "altered"); await writeFile(path, bytes);
      };
      if (defect === "claim-extra-field") hooks.afterClaim = async () => {
        const path = join(claim(f), "owner.json"), value = JSON.parse(await readFile(path));
        await writeFile(path, json({ ...value, forgedProof: true }));
      };
      if (defect === "cleanup-installed-revert") hooks.beforeCleanup = async () => {
        const path = join(f.outputRoot, SITE, "app.js"), bytes = await readFile(path);
        await writeFile(path, "altered"); await writeFile(path, bytes);
      };
      await assert.rejects(mechanical(f, hooks));
      assert.equal(await exists(claim(f)), true);
      if (defect === "backup-extra-dir") assert.equal(await exists(join(f.outputRoot, SITE)), false, "do not restore a tampered backup");
      if (defect === "archive-revert") assert.notEqual(await exists(newJournal(f)), true);
    } finally { await f.cleanup(); }
  });
}

test("production mode, confirmation, stale plan and every attempted proof override remain read-only", async () => {
  const f = await fixture();
  try {
    const p = await planBusinessConsentMasterMigration(f.options), before = await snapshot(f.root);
    await assert.rejects(authorize(f, p, { mode: "APPLY" }), /APPLY_MODE_REQUIRED/);
    await assert.rejects(authorize(f, p, { confirmation: "YES" }), /CONFIRMATION_REQUIRED/);
    await assert.rejects(authorize(f, p, { expectedPlanHash: "f".repeat(64) }), /PLAN_HASH_MISMATCH/);
    for (const key of ["writerExclusionProven", "maintenanceProof", "profile", "siteId", "publicHost", "hashes", "identity"]) {
      await assert.rejects(authorize(f, p, { [key]: true }), /ARGUMENT_INVALID/);
    }
    const inherited = Object.create({ writerExclusionProven: true }); Object.assign(inherited, f.options);
    await assert.rejects(planBusinessConsentMasterMigration(inherited), /ARGUMENT_INVALID/);
    process.env.BUSINESS_MASTER_WRITER_EXCLUSION_PROVEN = "true";
    try { await assert.rejects(authorize(f, p), /WRITER_EXCLUSION_UNPROVEN/); }
    finally { delete process.env.BUSINESS_MASTER_WRITER_EXCLUSION_PROVEN; }
    assert.deepEqual(await snapshot(f.root), before);
  } finally { await f.cleanup(); }
});
test("proof-looking files, test hooks and NODE_ENV never authorize public writes", async () => {
  const f = await fixture(), previousEnvironment = process.env.NODE_ENV;
  try {
    await writeFile(join(f.outputRoot, "writer-exclusion-proof.json"), json({ writerExclusionProven: true, jobs: [], maintenance: "approved" }));
    const p = await planBusinessConsentMasterMigration(f.options), before = await snapshot(f.root);
    for (const value of ["test", "production", "development"]) {
      process.env.NODE_ENV = value;
      await assert.rejects(authorize(f, p, { testHooks: { afterClaim: () => { throw new Error("MUST_NOT_REACH_WRITER"); } } }), /WRITER_EXCLUSION_UNPROVEN/);
    }
    assert.deepEqual(await snapshot(f.root), before);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
    await f.cleanup();
  }
});

test("every historical writer field is required, with exact original and refresh schemas", async (t) => {
  const f = await fixture();
  try {
    for (const path of [f.applyPath, f.refreshPath]) {
      const bytes = await readFile(path), value = JSON.parse(bytes);
      for (const key of Object.keys(value)) {
        await t.test(`${path === f.applyPath ? "original" : "refresh"} missing ${key}`, async () => {
          const changed = { ...value }; delete changed[key]; await writeFile(path, json(changed));
          if (path === f.applyPath) await writeFile(f.refreshPath, json({ ...f.refreshJournal, previousJournalHash: H(await readFile(path)) }));
          assert.equal((await planBusinessConsentMasterMigration(f.options)).artifactGate.valid, false);
          await writeFile(path, bytes);
          if (path === f.applyPath) await writeFile(f.refreshPath, json(f.refreshJournal));
        });
      }
    }
  } finally { await f.cleanup(); }
});

for (const defect of ["missing-journal", "missing-archive", "wrong-archive", "journal-extra", "journal-rehashed-incomplete-proof",
  "installed-extra-empty-dir", "old-archive-extra-dir", "reservation", "claim", "staging"]) {
  test(`readback does not certify partial or forged complete tuple: ${defect}`, async () => {
    const f = await fixture();
    try {
      await mechanical(f);
      if (defect === "missing-journal") await rm(newJournal(f));
      if (defect === "missing-archive") await rm(newArchive(f), { recursive: true });
      if (defect === "wrong-archive") await writeFile(join(newArchive(f), "config.js"), "forged");
      if (defect === "journal-extra") {
        const j = JSON.parse(await readFile(newJournal(f))); j.extra = true; await writeFile(newJournal(f), json(j));
      }
      if (defect === "journal-rehashed-incomplete-proof") {
        const j = JSON.parse(await readFile(newJournal(f))); delete j.planMaterial.predecessor.nodes;
        j.planHash = H(JSON.stringify(j.planMaterial)); await writeFile(newJournal(f), json(j));
      }
      if (defect === "installed-extra-empty-dir") await mkdir(join(f.outputRoot, SITE, "unaccounted"));
      if (defect === "old-archive-extra-dir") await mkdir(join(f.archivePath, "unaccounted"));
      if (defect === "reservation") await writeFile(newArchive(f) + ".reservation.json", "{}");
      if (defect === "claim") await mkdir(claim(f));
      if (defect === "staging") await mkdir(join(f.outputRoot, "." + SITE + ".refresh-unknown.staging"));
      const before = await snapshot(f.root), rb = await readBusinessConsentMasterMigration(f.options);
      assert.equal(rb.outcome, "BLOCKED"); assert.deepEqual(await snapshot(f.root), before);
    } finally { await f.cleanup(); }
  });
}

for (const defect of ["exists-string", "exists-number", "wrong-size", "file-mode-directory", "directory-mode-file",
  "file-mode-symlink", "mode-outside-native-bits", "leading-zero-inode", "inode-overflow", "device-overflow"]) {
  test(`F3 rehashed predecessor proof rejects impossible writer fact: ${defect}`, async () => {
    const f = await fixture();
    try {
      await mechanical(f);
      const path = newJournal(f), j = JSON.parse(await readFile(path));
      const proof = j.planMaterial.predecessor, file = proof.nodes.find((n) => n.path === "app.js"), directory = proof.nodes.find((n) => n.path === "");
      if (defect === "exists-string") proof.exists = "not-a-boolean";
      if (defect === "exists-number") proof.exists = 1;
      if (defect === "wrong-size") file.size = "0";
      if (defect === "file-mode-directory") file.mode = String(0o40700);
      if (defect === "directory-mode-file") directory.mode = String(0o100600);
      if (defect === "file-mode-symlink") file.mode = String(0o120777);
      if (defect === "mode-outside-native-bits") file.mode = String(0o100600 + 0x10000);
      if (defect === "leading-zero-inode") file.ino = "0" + file.ino;
      if (defect === "inode-overflow") file.ino = "18446744073709551616";
      if (defect === "device-overflow") file.dev = "18446744073709551616";
      j.planHash = H(JSON.stringify(j.planMaterial)); await writeFile(path, json(j));
      const before = await snapshot(f.root);
      assert.equal((await readBusinessConsentMasterMigration(f.options)).outcome, "BLOCKED");
      assert.deepEqual(await snapshot(f.root), before);
    } finally { await f.cleanup(); }
  });
}

test("F3 copied archive validates size facts without equating predecessor inode or clocks with copied files", async () => {
  const f = await fixture();
  try {
    await mechanical(f);
    const j = JSON.parse(await readFile(newJournal(f))), archive = await captureTree(newArchive(f));
    const original = j.planMaterial.predecessor.nodes.find((n) => n.path === "app.js"), copied = archive.nodes.find((n) => n.path === "app.js");
    assert.notEqual(original.ino, copied.ino); assert.equal(original.size, copied.size);
    assert.equal((await readBusinessConsentMasterMigration(f.options)).outcome, "ALREADY_APPLIED");
  } finally { await f.cleanup(); }
});

test("junctions and replaced root ancestors cannot masquerade as regular artifact trees", async () => {
  const f = await fixture();
  try {
    const alias = join(f.root, "template-link");
    await symlink(f.templateDirectory, alias, process.platform === "win32" ? "junction" : "dir");
    assert.equal((await planBusinessConsentMasterMigration({ ...f.options, templateDirectory: alias })).artifactGate.valid, false);
    await symlink(f.archivePath, join(f.outputRoot, SITE, "hidden-link"), process.platform === "win32" ? "junction" : "dir");
    assert.equal((await planBusinessConsentMasterMigration(f.options)).artifactGate.valid, false);
  } finally { await f.cleanup(); }
});

function runningJob(expiresAt = "2020-01-01T00:00:00.000Z") {
  const intent = { schemaVersion: 1, operation: "PUBLISH_PARTNER_ECOSYSTEM", ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    ownerSiteId: "ganomaster", siteId: SITE, ecosystemType: "BUSINESS", baseDomain: "ganomaster.pro", publicHost: "negocio.ganomaster.pro",
    sourceHash: "a".repeat(64), targetHash: "b".repeat(64), masterPackageHash: OLD };
  const id = H(JSON.stringify(intent));
  return { schemaVersion: 1, id, intentHash: id, intent, status: "RUNNING", phase: "PUBLISHING", revision: 1, attemptCount: 1,
    requestedBySubjectHash: "d".repeat(64), createdAt: "2020-01-01T00:00:00.000Z", updatedAt: "2020-01-01T00:00:00.000Z",
    lease: { tokenHash: "e".repeat(64), workerHash: "f".repeat(64), acquiredAt: "2020-01-01T00:00:00.000Z", expiresAt }, evidence: [] };
}
for (const defect of ["expired-lease", "live-lease", "unclassifiable-job", "site-claim", "nested-job-claim", "foreign-new-journal", "foreign-new-archive"]) {
  test(`PREVIEW rejects operational/conflicting state without writes: ${defect}`, async () => {
    const f = await fixture();
    try {
      if (defect.endsWith("lease")) {
        const job = runningJob(defect === "live-lease" ? "2099-01-01T00:00:00.000Z" : undefined);
        await writeFile(join(f.businessJobsDirectory, job.id + ".json"), json(job));
      }
      if (defect === "unclassifiable-job") await writeFile(join(f.businessJobsDirectory, "invalid.json"), "{}");
      if (defect === "site-claim") await mkdir(join(f.outputRoot, ".business-publication-site-claims/occupied"), { recursive: true });
      if (defect === "nested-job-claim") await mkdir(join(f.businessJobsDirectory, ".claims/occupied"), { recursive: true });
      if (defect === "foreign-new-journal") { await mkdir(dirname(newJournal(f)), { recursive: true }); await writeFile(newJournal(f), "foreign"); }
      if (defect === "foreign-new-archive") await mkdir(newArchive(f), { recursive: true });
      const before = await snapshot(f.root), p = await planBusinessConsentMasterMigration(f.options);
      assert.equal(p.artifactGate.valid, !defect.startsWith("foreign-new-")); await assert.rejects(authorize(f, p));
      assert.deepEqual(await snapshot(f.root), before);
    } finally { await f.cleanup(); }
  });
}
