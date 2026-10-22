import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import process from "node:process";
import test from "node:test";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const ROOT = resolve(import.meta.dirname, "../../..");
const SITE_ID = "ganomaster-business";
const LEGACY_COMMIT = "16afb035f971b4495adb07983222f3461f87312c";
const LEGACY_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const LEGACY_TEMPLATE_HASH = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const inventoryHash = files => sha256(JSON.stringify([...files.entries()]
  .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
  .sort((left, right) => left.path.localeCompare(right.path))));
const json = value => `${JSON.stringify(value, null, 2)}\n`;

// Only the previous, immutable package is reconstructed. The current canonical
// template is copied verbatim: never synthesize or sanitize its CONFIG fixture.
async function installLegacyPackage(outputRoot) {
  const names = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
  const files = new Map(names.map(name => [name, execFileSync("git", [
    "show", `${LEGACY_COMMIT}:plantillas-de-pagina/business/${name}`
  ], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 })]));
  assert.equal(inventoryHash(files), LEGACY_TEMPLATE_HASH);
  files.set(".htaccess", Buffer.from(`DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`));
  files.set("manifest.json", Buffer.from(json({
    schemaVersion: 1, siteId: SITE_ID, ecosystemType: "BUSINESS",
    publicHost: "business.ganomaster.pro", source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash: LEGACY_TEMPLATE_HASH,
    files: [...names, ".htaccess", "tipografia/"]
  })));
  assert.equal(inventoryHash(files), LEGACY_HASH);
  const destination = resolve(outputRoot, SITE_ID);
  await mkdir(resolve(destination, "tipografia"), { recursive: true });
  for (const [name, bytes] of files) await writeFile(resolve(destination, name), bytes, { flag: "wx" });
  const journalPath = resolve(outputRoot, ".master-package-audits/CDX-20260827-002/apply.json");
  await mkdir(dirname(journalPath), { recursive: true });
  await writeFile(journalPath, json({
    requestId: "CDX-20260827-002", mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE",
    outcome: "APPLIED", siteId: SITE_ID, planHash: "a".repeat(64),
    canonicalTemplateHash: LEGACY_TEMPLATE_HASH, expectedPackageHash: LEGACY_HASH,
    appliedAt: "2026-08-27T19:30:00.000Z"
  }), { flag: "wx" });
}

for (const operation of ["create", "refresh"]) {
  // Removing the canonical empty legacy CTA must block the real consumer here.
  test(`canonical Business template supports guarded ${operation} without non-neutral CTA data`, async t => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "ph-business-master-readiness-"));
    t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
    const templateDirectory = resolve(temporaryRoot, "template");
    const outputRoot = resolve(temporaryRoot, "output");
    const businessJobsDirectory = resolve(outputRoot, ".publication-jobs");
    await cp(resolve(ROOT, "plantillas-de-pagina/business"), templateDirectory, { recursive: true });
    await mkdir(businessJobsDirectory, { recursive: true });
    if (operation === "refresh") await installLegacyPackage(outputRoot);
    const sourceBytes = await readFile(resolve(ROOT, "plantillas-de-pagina/business/config.js"));
    assert.deepEqual(await readFile(resolve(templateDirectory, "config.js")), sourceBytes);
    const filename = operation === "create"
      ? "jairo-business-master-package.mjs"
      : "jairo-business-master-package-drift-recovery.mjs";
    const moduleUrl = pathToFileURL(resolve(import.meta.dirname, filename)).href;
    const suffix = operation === "create" ? "" : "Refresh";
    // Run the exported standalone entrypoints in a fresh Node CLI process with
    // explicit local paths; never consult /data, providers or publication jobs.
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import * as entrypoint from ${JSON.stringify(moduleUrl)};
      const options = ${JSON.stringify({ outputRoot, templateDirectory, businessJobsDirectory })};
      const plan = await entrypoint.planBusinessMasterPackage${suffix}(options);
      assert.equal(plan.blocked, false, JSON.stringify(plan.blockedReasons));
      const result = await entrypoint.applyBusinessMasterPackage${suffix}({
        ...options, mode: entrypoint.APPLY_MODE,
        confirmation: entrypoint.APPLY_CONFIRMATION, expectedPlanHash: plan.planHash
      });
      assert.equal(result.outcome, 'APPLIED');
      assert.equal(result.safety.providerCallsMade, false);
      assert.equal(result.safety.sftpAdapterCreated, false);
      process.stdout.write(JSON.stringify({ outcome: result.outcome, blocked: result.blocked }));
    `], { cwd: temporaryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.deepEqual(JSON.parse(output), { outcome: "APPLIED", blocked: false });
    const installedBytes = await readFile(resolve(outputRoot, SITE_ID, "config.js"));
    assert.deepEqual(installedBytes, sourceBytes, "packaging must preserve canonical config bytes");
    const config = new vm.Script(`${installedBytes.toString("utf8")}\n;CONFIG;`)
      .runInNewContext(Object.create(null), { timeout: 1000 });
    assert.equal(config.ecosystemType, "BUSINESS");
    assert.equal(config.site.id, SITE_ID);
    assert.equal(config.site.appName, SITE_ID);
    for (const key of ["primaryUrl", "secondaryUrl", "directRegisterUrl"]) assert.equal(config.cta[key], "", key);
    for (const key of ["brandName", "firstName", "fullName", "role", "whatsappNumber", "phoneNumber", "displayPhone", "ctaUrl", "defaultMessage"]) {
      assert.equal(config.distributor[key], "", key);
    }
    assert.deepEqual(await readFile(resolve(templateDirectory, "config.js")), sourceBytes);
  });
}
