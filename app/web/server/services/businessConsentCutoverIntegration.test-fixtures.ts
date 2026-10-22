import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, lstat, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { TestContext } from "node:test";
import type * as cli from "@/scripts/business-consent-cutover";
import type * as maintenance from "@/server/services/businessCutoverMaintenanceService";
import type * as store from "@/server/services/businessCutoverClaimStore";
import type * as migration from "@/server/services/businessConsentCutoverMigration";
import type * as verification from "@/server/services/businessCutoverReleaseVerification";
import type * as release from "@/server/services/businessCutoverReleaseService";
import { required } from "../../scripts/build-business-cutover-writer-inventory.test-fixtures.mjs";

export const web = resolve(import.meta.dirname, "../.."), repo = resolve(web, "../..");
export const reviewed235 = "82b6c5db71d158d8089af3207777249b5fb4e125";
export const oldHash = "9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046";
export const archiveHash = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const predecessor = "a8d547c1cf9d754573bf20eb5cc154a03f9f5c60", original = "16afb035f971b4495adb07983222f3461f87312c";
const names = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const pins = {
  "app.js": "fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de",
  "config.js": "ebfd341347e16651b130fb7be284326e728e17d1d793abe9877720d8e86847d0",
  "favicon.svg": "d0736575f83d7a107dd4368d1bb5b89d0baa8a3fff1ede5f4b1ea2a38151532e",
  "index.html": "39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb",
  "measurement-runtime.js": "78db567bbd5e6ab30aa9e2402bfa421aa043a7bad11ea046d56ef79df0dccf42",
  "styles.css": "302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59",
};
export const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
export type Material = { old: Record<string, string>; archive: Record<string, string>; successor: Record<string, string> };
export function historicalMaterial(): Material {
  // Clean Linux Git archives intentionally have no .git. The private harness
  // supplies only the pinned blob fixture prepared/checked on the host.
  if (process.env.CDX011_INTEGRATION_TEST_MATERIAL) return JSON.parse(readFileSync(process.env.CDX011_INTEGRATION_TEST_MATERIAL, "utf8"));
  const git = (commit: string, name: string) => execFileSync("git", ["show", `${commit}:plantillas-de-pagina/business/${name}`], { cwd: repo });
  const successor: Record<string, string> = {};
  for (const [name, expected] of Object.entries(pins)) {
    const bytes = git(reviewed235, name);
    assert.equal(sha(bytes), expected, `fixed235 pin ${name}`);
    assert.deepEqual(bytes, git("88c003d8cbb419522c20c084dc4a019a22d33155", name), `historical blob equivalence ${name}`);
    successor[name] = bytes.toString("base64");
  }
  return { old: Object.fromEntries(names.map((name) => [name, git(predecessor, name).toString("base64")])),
    archive: Object.fromEntries(names.map((name) => [name, git(original, name).toString("base64")])), successor };
}

// Test-only physical fixture. Exact Git bytes, no production data or providers.
export async function seedOutput(output: string, material: Material) {
  await mkdir(output, { recursive: true });
  const oldTemplate = "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99";
  const originalTemplate = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
  const htaccess = `DirectoryIndex index.html\n\n<IfModule mod_headers.c>\n  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">\n    Header set Cache-Control "no-cache, must-revalidate"\n    Header set Pragma "no-cache"\n    Header set Expires "0"\n  </FilesMatch>\n</IfModule>\n`;
  async function save(directory: string, files: Record<string, string>, templateHash: string) {
    await mkdir(resolve(directory, "tipografia"), { recursive: true });
    for (const [name, bytes] of Object.entries(files)) await writeFile(resolve(directory, name), Buffer.from(bytes, "base64"));
    await writeFile(resolve(directory, ".htaccess"), htaccess);
    await writeFile(resolve(directory, "manifest.json"), json({ schemaVersion: 1, siteId: "ganomaster-business", ecosystemType: "BUSINESS",
      publicHost: "business.ganomaster.pro", source: "CANONICAL_BUSINESS_TEMPLATE", canonicalTemplateHash: templateHash,
      files: [...names, ".htaccess", "tipografia/"] }));
  }
  await save(resolve(output, "ganomaster-business"), material.old, oldTemplate);
  const archive = resolve(output, ".master-package-archives/CDX-20261019-003/ganomaster-business");
  await save(archive, material.archive, originalTemplate);
  const history = resolve(output, ".master-package-audits/CDX-20260827-002/apply.json");
  const refresh = resolve(output, ".master-package-audits/CDX-20261019-003/refresh.json");
  const bytes = json({ requestId: "CDX-20260827-002", mode: "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE", outcome: "APPLIED",
    siteId: "ganomaster-business", planHash: "a".repeat(64), canonicalTemplateHash: originalTemplate,
    expectedPackageHash: archiveHash, appliedAt: "2026-08-27T19:30:00.000Z" });
  const refreshed = json({ schemaVersion: 1, operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE", requestId: "CDX-20261019-003",
    siteId: "ganomaster-business", ecosystemType: "BUSINESS", publicHost: "business.ganomaster.pro", planHash: "b".repeat(64),
    previousPackageHash: archiveHash, refreshedPackageHash: oldHash, canonicalTemplateHash: oldTemplate,
    previousJournalPath: history, previousJournalHash: sha(bytes), archivePath: archive, archivedPackageHash: archiveHash,
    appliedAt: "2026-10-19T19:30:00.000Z" });
  for (const [file, content] of [[history, bytes], [refresh, refreshed]]) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); }
  return { archive, history, refresh };
}

export type Graph = typeof cli & typeof maintenance & typeof store & typeof migration & typeof verification & typeof release;
// These are explicitly simulated image trees, NOT composed/reviewed images.
// Inventory and fixed semantic/pin checks are real. No approving factory exists.
export async function prepareGraph(root: string, successor: boolean, material: Material, paths?: { image: string; staging: string }) {
  const image = resolve(root, "image"), staging = resolve(root, "staging");
  await mkdir(image, { recursive: true }); await mkdir(staging, { recursive: true });
  for (const name of required) { await mkdir(dirname(resolve(image, name)), { recursive: true }); await writeFile(resolve(image, name), "SIMULATED WRITER BYTES; NOT APPROVED RELEASE\n"); }
  const canonical = resolve(image, "plantillas-de-pagina/business"); await mkdir(canonical, { recursive: true });
  for (const [name, bytes] of Object.entries(successor ? material.successor : material.old)) await writeFile(resolve(canonical, name), Buffer.from(bytes, "base64"));
  await writeFile(resolve(image, "runtime-assets/business-config.js"), await readFile(resolve(canonical, "config.js")));
  for (const [name, bytes] of Object.entries(material.successor)) {
    await writeFile(resolve(staging, name), Buffer.from(bytes, "base64"));
    if (!successor) { const file = resolve(image, "runtime-assets/business-consent-successor", name); await mkdir(dirname(file), { recursive: true }); await writeFile(file, Buffer.from(bytes, "base64")); }
  }
  const builderSource = await readFile(resolve(web, "scripts/build-business-cutover-writer-inventory.mjs"), "utf8");
  const inventoryBuilder = await import(`data:text/javascript;base64,${Buffer.from(builderSource.replaceAll('"/app"', JSON.stringify(image))).toString("base64")}#${randomUUID()}`);
  const inventory = await inventoryBuilder.buildBusinessCutoverWriterInventory(), bytes = Buffer.from(JSON.stringify(inventory));
  await writeFile(resolve(image, "runtime-assets/business-cutover-writer-inventory.json"), bytes);
  const deployment = paths ?? { image, staging };
  const services = ["businessCutoverMaintenanceService", "businessCutoverClaimStore", "businessConsentCutoverMigration",
    "businessCutoverReleaseVerification", "businessCutoverReleaseService"];
  const result = await build({ stdin: { contents: services.map((name) => `export * from './server/services/${name}';`).join("\n") +
    "\nexport * from './scripts/business-consent-cutover';", resolveDir: web, loader: "ts" }, absWorkingDir: web,
    bundle: true, platform: "node", format: "esm", target: "node20", write: false, metafile: true,
    alias: { "server-only": "./server/runtime/serverOnlyRuntimeShim.mjs" },
    define: { __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: JSON.stringify({ version: 1, releaseId: inventory.releaseId, inventorySha256: sha(bytes) }) },
    plugins: [{ name: "private-integration-paths", setup(b) {
      b.onLoad({ filter: /(?:build-business-cutover-writer-inventory\.mjs|businessCutoverReleaseProfile\.ts|businessCutoverMigrationAuthority\.ts|business-consent-master-release\.mjs)$/ }, async (args) => ({
        contents: (await readFile(args.path, "utf8")).replaceAll('"/app"', JSON.stringify(deployment.image))
          .replaceAll('"/app/runtime-assets/business-cutover-writer-inventory.json"', JSON.stringify(resolve(deployment.image, "runtime-assets/business-cutover-writer-inventory.json")))
          .replaceAll('"/app/runtime-assets/business-consent-successor"', JSON.stringify(deployment.staging)), loader: args.path.endsWith(".ts") ? "ts" : "js" }));
    } }] });
  for (const name of services) assert.equal(Object.keys(result.metafile!.inputs).filter((p) => p.endsWith(`/${name}.ts`)).length, 1, `${name} single graph`);
  const file = resolve(root, "graph.mjs"); await writeFile(file, result.outputFiles[0].contents);
  return { image, staging, file };
}
export async function setup(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), "cdx011-integration-")), output = resolve(root, "output"), material = historicalMaterial();
  t.after(() => rm(root, { recursive: true, force: true }));
  const protectedPaths = await seedOutput(output, material);
  const a = await prepareGraph(resolve(root, "predecessor"), false, material);
  const b = await prepareGraph(resolve(root, "successor"), true, material,
    { image: resolve(root, "successor/image"), staging: a.staging });
  const m = await import(pathToFileURL(a.file).href) as Graph, next = await import(pathToFileURL(b.file).href) as Graph;
  const id = randomUUID();
  return { root, output, id, a, b, m, next, ...protectedPaths };
}
export function command(mode: string, id: string, extra: string[] = []) {
  const confirmation: Record<string, string> = { APPLY: "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", CANCEL: "CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER", REOPEN: "REOPEN_VERIFIED_BUSINESS_CONSENT_MASTER" };
  return [`--mode=${mode}`, `--operation-id=${id}`, ...(confirmation[mode] ? [`--confirm=${confirmation[mode]}`] : []), ...extra];
}
export function node20Command(file: string, output: string, args: string[]) {
  const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(node20, "BUSINESS_CUTOVER_TEST_NODE20 must name an actual Node20 executable");
  const version = spawnSync(node20, ["--version"], { encoding: "utf8" }); assert.equal(version.status, 0); assert.match(version.stdout, /^v20\./);
  const script = `globalThis.fetch=()=>{throw new Error('UNEXPECTED_PROVIDER')}; const m=await import(${JSON.stringify(pathToFileURL(file).href)});const result=await m.runBusinessConsentCutover(${JSON.stringify(args)}); console.log(JSON.stringify(result));`;
  const result = spawnSync(node20, ["--input-type=module", "-e", script], { env: { ...process.env, PRODUCT_PAGE_OUTPUT_DIR: output }, encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, ""); return JSON.parse(result.stdout);
}
export async function physicalSnapshot(root: string) {
  const result: Record<string, unknown> = {};
  async function visit(file: string, relative: string) {
    const s = await lstat(file, { bigint: true });
    result[relative] = { dev: String(s.dev), ino: String(s.ino), uid: String(s.uid), mode: String(s.mode & 0o777n),
      nlink: String(s.nlink), mtimeNs: String(s.mtimeNs), ctimeNs: String(s.ctimeNs), hash: s.isFile() ? sha(await readFile(file)) : null };
    if (s.isDirectory()) for (const name of (await readdir(file)).sort()) await visit(resolve(file, name), relative ? `${relative}/${name}` : name);
  }
  await visit(root, ""); return result;
}
