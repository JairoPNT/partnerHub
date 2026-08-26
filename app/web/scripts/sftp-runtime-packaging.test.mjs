import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import test from "node:test";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "../../..");
const webRoot = resolve(import.meta.dirname, "..");
const banner = "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);";
const allowedOptionalImports = new Set(["cpu-features", "./crypto/build/Release/sshcrypto.node"]);

test("Docker builds self-contained SFTP maintenance entrypoints", async () => {
  const dockerfile = await readFile(join(root, "Dockerfile"), "utf8");
  for (const name of ["guarded-ecosystem-publication.mjs", "sftp-directory-rename-capability-probe.mjs"]) {
    assert.ok(dockerfile.includes(`esbuild scripts/${name}`));
    assert.ok(dockerfile.includes(`--outfile=/repo/runtime-assets/${name}`));
    assert.ok(dockerfile.includes(`COPY --from=builder /repo/runtime-assets/${name} ./scripts/${name}`));
  }

  const outputDirectory = await mkdtemp(join(tmpdir(), "partnerhub-sftp-runtime-"));
  try {
    for (const name of ["guarded-ecosystem-publication.mjs", "sftp-directory-rename-capability-probe.mjs"]) {
      const outfile = join(outputDirectory, name);
      const result = await build({
        entryPoints: [join(webRoot, "scripts", name)],
        outfile,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node20",
        banner: { js: banner },
        metafile: true,
      });
      const externalImports = Object.values(result.metafile.outputs)
        .flatMap((output) => output.imports)
        .filter((entry) => entry.external)
        .filter((entry) => !entry.path.startsWith("node:"))
        .filter((entry) => !builtinModules.includes(entry.path))
        .filter((entry) => !allowedOptionalImports.has(entry.path));
      assert.deepEqual(externalImports, [], `${name} must not require runtime npm packages`);
    }

    const probe = join(outputDirectory, "sftp-directory-rename-capability-probe.mjs");
    const execution = spawnSync(process.execPath, [probe, "--manifest=missing.json", "--mode=PREVIEW"], {
      cwd: outputDirectory,
      encoding: "utf8",
    });
    assert.equal(execution.status, 1);
    assert.equal((execution.stderr.match(/ENOENT/g) ?? []).length, 1, "bundled probe must execute exactly one CLI main");
    assert.doesNotMatch(execution.stderr, /Cannot find package 'ssh2-sftp-client'/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
