import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const webRoot = resolve(import.meta.dirname, "..");

test("Docker installs an isolated locked SFTP runtime and validates module semantics", async () => {
  const dockerfile = await readFile(join(root, "Dockerfile"), "utf8");
  assert.match(dockerfile, /FROM base AS sftp-runtime-deps/);
  assert.match(dockerfile, /npm ci --omit=dev --omit=optional --ignore-scripts/);
  assert.match(dockerfile, /RUN node smoke\.mjs/);
  assert.match(dockerfile, /COPY --from=sftp-runtime-deps \/repo\/sftp-runtime\/node_modules \.\/scripts\/node_modules/);
  assert.doesNotMatch(dockerfile, /esbuild scripts\/(guarded-ecosystem-publication|sftp-directory-rename-capability-probe)\.mjs/);

  const runtimePackage = JSON.parse(await readFile(join(webRoot, "runtime-deps", "sftp", "package.json"), "utf8"));
  const runtimeLock = JSON.parse(await readFile(join(webRoot, "runtime-deps", "sftp", "package-lock.json"), "utf8"));
  assert.deepEqual(runtimePackage.dependencies, { "ssh2-sftp-client": "12.1.1" });
  assert.equal(runtimeLock.packages[""].dependencies["ssh2-sftp-client"], "12.1.1");
  assert.equal(runtimeLock.packages["node_modules/ssh2-sftp-client"].version, "12.1.1");

  const execution = spawnSync(process.execPath, [join(webRoot, "runtime-deps", "sftp", "smoke.mjs")], {
    encoding: "utf8",
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.deepEqual(JSON.parse(execution.stdout), { status: "SFTP_RUNTIME_READY", providerCallsMade: false });
});
