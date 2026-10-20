import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fork } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createProductMutationCoordinator, ProductMutationBusyError, withoutProductMutationOwnership } from "./productMutationCoordinator.ts";

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((done) => { release = done; });
  return { promise, release };
}
async function fixture(t: test.TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), "product-mutation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const claim = resolve(root, ".product-mutation-claims", createHash("sha256").update("legacy-client").digest("hex"));
  return { root, claim, owner: resolve(claim, "owner.json"), withSite: createProductMutationCoordinator({ outputDirectory: root }) };
}

test("legacy Product ownership reenters only live scopes and isolates unrelated sites", async (t) => {
  const fx = await fixture(t);
  await fx.withSite("legacy-client", async () => {
    await fx.withSite("legacy-client", async () => 1);
    await withoutProductMutationOwnership(async () => {
      await assert.rejects(fx.withSite("legacy-client", async () => assert.fail("overlap")), ProductMutationBusyError);
      assert.equal(await fx.withSite("other-client", async () => "independent"), "independent");
    });
  });
  assert.equal(await fx.withSite("legacy-client", async () => "released"), "released");
  await assert.rejects(fx.withSite("../escape", async () => 1), /PRODUCT_MUTATION_SITE_ID_INVALID/);
});

test("entered detached work retains ownership but expired inherited scopes cannot reenter", async (t) => {
  const fx = await fixture(t); const entered = barrier(); const finish = barrier(); const staleStart = barrier();
  let detached!: Promise<void>; let stale!: Promise<void>;
  await fx.withSite("legacy-client", async () => {
    stale = (async () => { await staleStart.promise; await assert.rejects(fx.withSite("legacy-client", async () => assert.fail("expired scope")), ProductMutationBusyError); })();
    detached = fx.withSite("legacy-client", async () => { entered.release(); await finish.promise; });
    await entered.promise;
  });
  try {
    staleStart.release(); await stale;
    await assert.rejects(fx.withSite("legacy-client", async () => 1), ProductMutationBusyError);
  } finally { finish.release(); await detached; }
  await fx.withSite("legacy-client", async () => 1);
});

for (const mutation of ["foreign-token", "replacement", "directory", "hardlink"] as const) {
  test(`ownership release leaves ${mutation} marker untouched and fails closed`, async (t) => {
    const fx = await fixture(t);
    await assert.rejects(fx.withSite("legacy-client", async () => {
      const bytes = await readFile(fx.owner);
      if (mutation === "foreign-token") await writeFile(fx.owner, '{"token":"foreign"}');
      if (mutation === "replacement") { await rename(fx.owner, `${fx.owner}.old`); await writeFile(fx.owner, bytes); }
      if (mutation === "directory") { await rename(fx.owner, `${fx.owner}.old`); await mkdir(fx.owner); }
      if (mutation === "hardlink") await link(fx.owner, `${fx.owner}.link`);
      await fx.withSite("legacy-client", async () => assert.fail("unsafe reentry"));
    }), ProductMutationBusyError);
    await assert.rejects(fx.withSite("legacy-client", async () => 1), ProductMutationBusyError);
  });
}

test("a symlinked claims namespace cannot redirect writes into foreign storage", async (t) => {
  const fx = await fixture(t); const foreign = resolve(fx.root, "foreign"); await mkdir(foreign);
  await symlink(foreign, resolve(fx.root, ".product-mutation-claims"), "junction");
  await assert.rejects(fx.withSite("legacy-client", async () => assert.fail("unsafe root")), ProductMutationBusyError);
});

test("real second process cannot steal a live ancient owner; custom roots remain independent", { timeout: 15_000 }, async (t) => {
  const fx = await fixture(t);
  const child = fork(resolve("scripts/product-mutation-coordinator-child.mjs"), [fx.root], { execArgv: ["--experimental-strip-types"], stdio: ["ignore", "ignore", "pipe", "ipc"] });
  const closed = new Promise((done) => child.once("exit", done));
  t.after(async () => { if (child.exitCode === null) child.kill(); await closed; });
  await new Promise((done, reject) => { child.once("message", done); child.once("error", reject); child.once("exit", () => reject(new Error("owner child exited early"))); });
  await assert.rejects(fx.withSite("legacy-client", async () => assert.fail("stolen")), ProductMutationBusyError);
  const other = createProductMutationCoordinator({ outputDirectory: resolve(fx.root, "independent") });
  await other("legacy-client", async () => 1);
  child.send("release"); await closed;
  await fx.withSite("legacy-client", async () => 1);
});
