import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path, { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { syncBuiltinESMExports } from "node:module";
import type { TestContext } from "node:test";
import * as maintenance from "./businessCutoverMaintenanceService.ts";
import { resumeBusinessCutoverClosure } from "./businessCutoverClaimStore.ts";

export const repo = resolve(import.meta.dirname, "../../../..");
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
export const oldHash = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
const originalHash = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const oldTemplateHash = "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99";
const originalTemplateHash = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const names = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const htaccess = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;
const git = (commit: string, name: string) => execFileSync("git", ["show", `${commit}:plantillas-de-pagina/business/${name}`], { cwd: repo });
export async function fixture(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), "cdx011-migration-"));
  const output = resolve(root, "output"), staging = resolve(root, "staging");
  await mkdir(output); await mkdir(staging);
  const oldResolve = path.resolve;
  // Redirect ONLY the immutable staging literal in this test process. All
  // filesystem I/O, identities, claims, locks and mutations remain real.
  t.mock.method(path, "resolve", (...args: string[]) => args.length === 1 && args[0] === "/app/runtime-assets/business-consent-successor"
    ? staging : oldResolve(...args));
  syncBuiltinESMExports();
  t.after(async () => { t.mock.restoreAll(); syncBuiltinESMExports(); await rm(root, { recursive: true, force: true }); });
  for (const name of [...names, "measurement-runtime.js"]) await writeFile(resolve(staging, name), git("88c003d8cbb419522c20c084dc4a019a22d33155", name));
  async function save(directory: string, commit: string, templateHash: string) {
    await mkdir(resolve(directory, "tipografia"), { recursive: true });
    for (const name of names) await writeFile(resolve(directory, name), git(commit, name));
    await writeFile(resolve(directory, ".htaccess"), htaccess);
    await writeFile(resolve(directory, "manifest.json"), json({ schemaVersion: 1, siteId: "ganomaster-business", ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro", source: "CANONICAL_BUSINESS_TEMPLATE", canonicalTemplateHash: templateHash,
      files: [...names, ".htaccess", "tipografia/"] }));
  }
  await save(resolve(output, "ganomaster-business"), "a8d547c1cf9d754573bf20eb5cc154a03f9f5c60", oldTemplateHash);
  const archive = resolve(output, ".master-package-archives/CDX-20261019-003/ganomaster-business");
  await save(archive, "16afb035f971b4495adb07983222f3461f87312c", originalTemplateHash);
  const history = resolve(output, ".master-package-audits/CDX-20260827-002/apply.json");
  const refresh = resolve(output, ".master-package-audits/CDX-20261019-003/refresh.json");
  const original = json({ requestId: "CDX-20260827-002", mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE", outcome: "APPLIED",
    siteId: "ganomaster-business", planHash: "a".repeat(64), canonicalTemplateHash: originalTemplateHash,
    expectedPackageHash: originalHash, appliedAt: "2026-08-27T19:30:00.000Z" });
  const refreshed = json({ schemaVersion: 1, operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE", requestId: "CDX-20261019-003",
    siteId: "ganomaster-business", ecosystemType: "BUSINESS", publicHost: "business.ganomaster.pro", planHash: "b".repeat(64),
    previousPackageHash: originalHash, refreshedPackageHash: oldHash, canonicalTemplateHash: oldTemplateHash,
    previousJournalPath: history, previousJournalHash: hash(original), archivePath: archive, archivedPackageHash: originalHash,
    appliedAt: "2026-10-19T19:30:00.000Z" });
  for (const [file, bytes] of [[history, original], [refresh, refreshed]]) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, bytes); }
  const id = randomUUID(); await maintenance.beginBusinessCutover(output, id);
  const run = async <T>(action: (scope: maintenance.BusinessCutoverExclusiveScope) => Promise<T>) => {
    const handle = await resumeBusinessCutoverClosure(output, id);
    return maintenance.withBusinessCutoverController(handle, async (control) => {
      await maintenance.drainBusinessCutover(control, 0);
      return maintenance.withBusinessCutoverExclusive(control, async (scope) => {
        // Domain errors are values inside controller; its010 authority wrapper
        // intentionally normalizes thrown errors to CLOSED.
        try { return { value: await action(scope), error: null }; }
        catch (error) { return { value: undefined, error }; }
      });
    });
  };
  return { root, output, staging, id, run, history, refresh, archive };
}
export async function api() {
  const module = await import("./businessConsentCutoverMigration.ts").catch(() => null);
  assert.ok(module, "T2 connector is not implemented"); return module;
}
