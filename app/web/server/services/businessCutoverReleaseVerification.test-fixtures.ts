import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { lstat, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TestContext } from "node:test";
import { fixture } from "./businessConsentCutoverMigration.test-fixtures.ts";
import { image, builder } from "../../scripts/build-business-cutover-writer-inventory.test-fixtures.mjs";
import type { BusinessCutoverExclusiveScope } from "./businessCutoverMaintenanceService.ts";

const web = resolve(import.meta.dirname, "../..");
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
type Graph = typeof import("./businessCutoverReleaseVerification.ts") & typeof import("./businessCutoverReleaseProfile.ts") &
  typeof import("./businessCutoverMaintenanceService.ts") & typeof import("./businessCutoverClaimStore.ts") & typeof import("./businessConsentCutoverMigration.ts");
export async function compiled(t: TestContext, successor = false, compiledDescriptor?: unknown) {
  const root = await image(t, successor), b = await builder(root);
  const inventory = await b.buildBusinessCutoverWriterInventory(), bytes = Buffer.from(JSON.stringify(inventory));
  await writeFile(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"), bytes);
  const descriptor = compiledDescriptor === undefined ? { version: 1, releaseId: inventory.releaseId, inventorySha256: sha(bytes) } : compiledDescriptor;
  const verifier = resolve(web, "server/services/businessCutoverReleaseVerification.ts");
  assert.ok(await lstat(verifier).catch(() => null), "T3 verifier is not implemented");
  const result = await build({ stdin: { contents: `export * from ${JSON.stringify(verifier)};
    export * from ${JSON.stringify(resolve(web, "server/services/businessCutoverReleaseProfile.ts"))};
    export * from ${JSON.stringify(resolve(web, "server/services/businessCutoverMaintenanceService.ts"))};
    export * from ${JSON.stringify(resolve(web, "server/services/businessCutoverClaimStore.ts"))};
    export * from ${JSON.stringify(resolve(web, "server/services/businessConsentCutoverMigration.ts"))};`, resolveDir: web, loader: "ts" },
    absWorkingDir: web, bundle: true, platform: "node", format: "esm", target: "node20", write: false,
    alias: { "server-only": resolve(web, "server/runtime/serverOnlyRuntimeShim.mjs") },
    define: { __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: JSON.stringify(descriptor) },
    plugins: [{ name: "private-image-root", setup(b) { b.onLoad({ filter: /build-business-cutover-writer-inventory\.mjs$/ }, async (args) =>
      ({ contents: (await readFile(args.path, "utf8")).replaceAll('"/app"', JSON.stringify(root)), loader: "js" }));
      b.onLoad({ filter: /businessCutoverReleaseProfile\.ts$/ }, async (args) =>
        ({ contents: (await readFile(args.path, "utf8")).replaceAll('"/app/runtime-assets/business-cutover-writer-inventory.json"', JSON.stringify(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"))), loader: "ts" }));
    } }] });
  const file = resolve(root, "test-administrative-bundle.mjs"); await writeFile(file, result.outputFiles[0].contents);
  // Import graph once, then remove test artifact from the image inventory.
  const m = await import(pathToFileURL(file).href) as Graph; await rm(file);
  const run = async <T>(f: Awaited<ReturnType<typeof fixture>>, action: (scope: BusinessCutoverExclusiveScope) => Promise<T>) => {
    const handle = await m.resumeBusinessCutoverClosure(f.output, f.id);
    return m.withBusinessCutoverController(handle, async (control) => {
      await m.drainBusinessCutover(control, 0);
      return m.withBusinessCutoverExclusive(control, async (scope) => {
        try { return { value: await action(scope), error: null }; } catch (error) { return { value: undefined, error }; }
      });
    });
  };
  return { root, m, run };
}
export async function migrated(t: TestContext) {
  const f = await fixture(t), c = await compiled(t, true);
  const preview = await c.run(f, async (scope) => c.m.describeBusinessConsentCutover(await c.m.captureBusinessConsentCutover(scope)));
  assert.equal(preview.error, null);
  assert.equal((await c.run(f, (scope) => c.m.applyBusinessConsentCutover(scope, preview.value!.planHash))).error, null);
  return { f, c };
}
