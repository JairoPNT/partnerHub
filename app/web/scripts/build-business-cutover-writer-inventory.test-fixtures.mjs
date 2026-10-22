import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";

const repo = resolve(import.meta.dirname, "../../..");
export const required = ["server.js", "package.json", "package-lock.json", ".next/server/app/page.js", ".next/static/app.js",
  "node_modules/next/package.json", "scripts/node_modules/ssh2-sftp-client/package.json",
  "runtime-assets/jairo-business-in-process-provisioner.mjs", "runtime-assets/jairo-business-package-generator.mjs",
  "runtime-assets/product-mutation-coordinator.mjs", "runtime-assets/business-config.js",
  "scripts/business-consent-master-package-migration.mjs", "scripts/business-cutover-maintenance.mjs",
  "scripts/business-master-transition-lifecycle.mjs"];
const names = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const git = (commit, name) => execFileSync("git", ["show", `${commit}:plantillas-de-pagina/business/${name}`], { cwd: repo });
export async function image(t, successor = false) {
  const root = await mkdtemp(resolve(tmpdir(), "cdx011-image-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of required) { await mkdir(dirname(resolve(root, file)), { recursive: true }); await writeFile(resolve(root, file), "cooperative fixture bytes\n"); }
  for (const name of names) {
    const file = resolve(root, "plantillas-de-pagina/business", name); await mkdir(dirname(file), { recursive: true });
    await writeFile(file, git(successor ? "88c003d8cbb419522c20c084dc4a019a22d33155" : "a8d547c1cf9d754573bf20eb5cc154a03f9f5c60", name));
    if (name === "config.js") await writeFile(resolve(root, "runtime-assets/business-config.js"), await readFile(file));
  }
  if (successor) await writeFile(resolve(root, "plantillas-de-pagina/business/measurement-runtime.js"), git("88c003d8cbb419522c20c084dc4a019a22d33155", "measurement-runtime.js"));
  if (!successor) for (const name of [...names, "measurement-runtime.js"]) {
    const file = resolve(root, "runtime-assets/business-consent-successor", name); await mkdir(dirname(file), { recursive: true });
    await writeFile(file, git("88c003d8cbb419522c20c084dc4a019a22d33155", name));
  }
  return root;
}
export async function builder(root) {
  const source = await readFile(resolve(import.meta.dirname, "build-business-cutover-writer-inventory.mjs"), "utf8").catch(() => null);
  assert.ok(source, "T3 inventory builder is not implemented");
  // Private test build changes the immutable deployment literal, not a runtime API.
  return import(`data:text/javascript;base64,${Buffer.from(source.replaceAll('"/app"', JSON.stringify(root))).toString("base64")}#${Math.random()}`);
}
