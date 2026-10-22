import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, symlink, link } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import test from "node:test";
import { image, builder } from "./build-business-cutover-writer-inventory.test-fixtures.mjs";

test("inventory_covers_all_shipped_files_and_has_only_exact_exclusions", async (t) => {
  const root = await image(t); const s = await builder(root);
  await writeFile(resolve(root, "scripts/business-consent-cutover.mjs"), "admin excluded");
  await writeFile(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"), "self excluded");
  await writeFile(resolve(root, "scripts/extra-writer.mjs"), "unreviewed image is not provenance");
  const inventory = await s.buildBusinessCutoverWriterInventory();
  assert.equal(inventory.version, 1); assert.equal(inventory.releaseId, "business-consent-predecessor-v1");
  const paths = inventory.files.map((row) => row.path);
  assert.deepEqual(paths, [...paths].sort());
  assert.ok(paths.includes("scripts/extra-writer.mjs"));
  assert.ok(paths.includes(".next/server/app/page.js"));
  assert.ok(paths.includes("scripts/node_modules/ssh2-sftp-client/package.json"));
  assert.ok(!paths.includes("scripts/business-consent-cutover.mjs"));
  assert.ok(!paths.includes("runtime-assets/business-cutover-writer-inventory.json"));
  const row = inventory.files.find((row) => row.path === "scripts/extra-writer.mjs");
  assert.deepEqual(row, { path: "scripts/extra-writer.mjs", sha256: createHash("sha256").update("unreviewed image is not provenance").digest("hex"), size: 34 });
});
test("inventory_missing_fixed_artifacts_is_unavailable_but_wrong_bytes_fail", async (t) => {
  const root = await image(t); const s = await builder(root);
  await rm(resolve(root, "runtime-assets/business-consent-successor/measurement-runtime.js"));
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
  await writeFile(resolve(root, "runtime-assets/business-consent-successor/measurement-runtime.js"), "wrong");
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("inventory_missing_guard_or_next_bundle_rejects", async (t) => {
  for (const file of ["runtime-assets/product-mutation-coordinator.mjs", ".next/server/app/page.js"]) {
    const root = await image(t), s = await builder(root); await rm(resolve(root, file));
    await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
  }
});
test("inventory_links_and_hardlinks_are_not_approved", async (t) => {
  const root = await image(t), s = await builder(root);
  await link(resolve(root, "server.js"), resolve(root, "duplicate.js"));
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
  await rm(resolve(root, "duplicate.js"));
  try { await symlink(resolve(root, "server.js"), resolve(root, "link.js")); }
  catch (error) { if (process.platform === "win32" && error.code === "EPERM") return; throw error; }
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("canonical_starter_is_covered_but_is_not_a_template_input", async (t) => {
  const root = await image(t), s = await builder(root);
  await mkdir(resolve(root, "plantillas-de-pagina/business/starter"));
  await writeFile(resolve(root, "plantillas-de-pagina/business/starter/example.js"), "starter");
  assert.ok((await s.buildBusinessCutoverWriterInventory()).files.some((r) => r.path === "plantillas-de-pagina/business/starter/example.js"));
});
test("runtime_business_config_cannot_differ_from_fixed_canonical", async (t) => {
  const root = await image(t), s = await builder(root);
  await writeFile(resolve(root, "runtime-assets/business-config.js"), "providers enabled");
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("present_bad_pin_is_fatal_even_if_another_dependent_input_is_missing", async (t) => {
  const root = await image(t), s = await builder(root);
  await rm(resolve(root, "runtime-assets/business-consent-successor/measurement-runtime.js"));
  await writeFile(resolve(root, "plantillas-de-pagina/business/config.js"), "unreviewed");
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("bad_runtime_config_is_fatal_before_missing_staging_classification", async (t) => {
  const root = await image(t), s = await builder(root);
  await rm(resolve(root, "runtime-assets/business-consent-successor"), { recursive: true });
  await writeFile(resolve(root, "runtime-assets/business-config.js"), "unreviewed");
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("present_runtime_config_is_checked_before_canonical_completeness", async (t) => {
  for (const successor of [false, true]) for (const missing of ["styles.css", "config.js", "all"]) {
    await t.test(`${successor ? "successor" : "predecessor"}/${missing}`, async (st) => {
      const root = await image(st, successor), s = await builder(root);
      const runtimePath = resolve(root, "runtime-assets/business-config.js"), reviewed = await readFile(runtimePath);
      const canonical = resolve(root, "plantillas-de-pagina/business");
      await rm(missing === "all" ? canonical : resolve(canonical, missing), { recursive: missing === "all" });
      await writeFile(runtimePath, "unreviewed");
      await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
      await writeFile(runtimePath, reviewed);
      await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
    });
  }
});
test("present_runtime_config_must_match_remaining_fixed_profile_candidates", async (t) => {
  const root = await image(t), s = await builder(root);
  await rm(resolve(root, "plantillas-de-pagina/business/config.js"));
  // Successor bytes are reviewed, but incompatible with the remaining old
  // canonical inputs. Absence is not permission to mix the fixed profiles.
  await writeFile(resolve(root, "runtime-assets/business-config.js"), await readFile(resolve(root, "runtime-assets/business-consent-successor/config.js")));
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("extra_empty_staging_directory_is_not_a_reviewed_six_file_tree", async (t) => {
  const root = await image(t), s = await builder(root);
  await mkdir(resolve(root, "runtime-assets/business-consent-successor/extra"));
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("extra_staging_input_rejects_and_missing_canonical_is_unavailable", async (t) => {
  const root = await image(t), s = await builder(root);
  await writeFile(resolve(root, "runtime-assets/business-consent-successor/extra.js"), "extra");
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
  await rm(resolve(root, "runtime-assets/business-consent-successor/extra.js"));
  await rm(resolve(root, "plantillas-de-pagina/business/styles.css"));
  await assert.rejects(s.buildBusinessCutoverWriterInventory(), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});
test("successor_can_omit_previous_staging_overlay", async (t) => {
  const root = await image(t, true), s = await builder(root);
  await rm(resolve(root, "runtime-assets/business-consent-successor"), { recursive: true, force: true });
  assert.equal((await s.buildBusinessCutoverWriterInventory()).releaseId, "business-consent-successor-v1");
});
test("actual_node20_builder_runs_without_ts_or_fallback", async (t) => {
  const binary = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(binary, "BUSINESS_CUTOVER_TEST_NODE20 is required");
  const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
  assert.equal(version.status, 0, version.stderr); assert.match(version.stdout.trim(), /^v20\./);
  const root = await image(t);
  const source = (await readFile(resolve(import.meta.dirname, "build-business-cutover-writer-inventory.mjs"), "utf8")).replaceAll('"/app"', JSON.stringify(root));
  const script = resolve(root, "scripts/business-consent-cutover.mjs"); await writeFile(script, source);
  const result = spawnSync(binary, ["--input-type=module", "-e", `import {buildBusinessCutoverWriterInventory as build} from ${JSON.stringify(pathToFileURL(script).href)}; console.log((await build()).releaseId);`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), "business-consent-predecessor-v1"); assert.equal(result.stderr, "");
});
