import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { BusinessSiteBusyError, createBusinessPublicationSiteCoordinator } from "./businessPublicationSiteCoordinator.ts";

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "business-site-coordinator-"));
  return { directory, withSite: createBusinessPublicationSiteCoordinator({ outputDirectory: directory }) };
}

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((done) => { release = done; });
  return { promise, release };
}

test("same site excludes unrelated calls, different sites proceed, owner reenters and error releases", async () => {
  const { directory, withSite } = await fixture();
  const entered = barrier(); const finish = barrier();
  try {
    const owner = withSite("ana-business", async () => {
      await withSite("ana-business", async () => "nested");
      entered.release();
      await finish.promise;
      throw new Error("action failed");
    });
    const rejected = assert.rejects(owner, /action failed/);
    await entered.promise;
    await assert.rejects(withSite("ana-business", async () => assert.fail("contender entered")), BusinessSiteBusyError);
    assert.equal(await withSite("bea-business", async () => "independent"), "independent");
    finish.release();
    await rejected;
    assert.equal(await withSite("ana-business", async () => "released"), "released");
  } finally { finish.release(); await rm(directory, { recursive: true, force: true }); }
});

test("ownership replacement is not removed by former owner and old markers are never stolen", async () => {
  const { directory, withSite } = await fixture();
  try {
    await withSite("ana-business", async () => {
      const root = resolve(directory, ".business-publication-site-claims");
      const [claim] = await readdir(root);
      const ownerPath = resolve(root, claim, "owner.json");
      const owner = JSON.parse(await readFile(ownerPath, "utf8"));
      await writeFile(ownerPath, JSON.stringify({ ...owner, token: "different-owner", acquiredAt: "2000-01-01T00:00:00.000Z" }));
      await assert.rejects(withSite("ana-business", async () => assert.fail("reentered without ownership")), BusinessSiteBusyError);
    });
    await assert.rejects(withSite("ana-business", async () => assert.fail("stole orphan")), BusinessSiteBusyError);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("a detached async context cannot retain reentrant ownership after its action returns", async () => {
  const { directory, withSite } = await fixture();
  const start = barrier(); let detached!: Promise<unknown>;
  try {
    await withSite("ana-business", async () => {
      detached = start.promise.then(() => withSite("ana-business", async () => "stale context entered"));
    });
    await withSite("ana-business", async () => {
      const rejection = assert.rejects(detached, BusinessSiteBusyError);
      start.release();
      await rejection;
    });
  } finally { start.release(); await rm(directory, { recursive: true, force: true }); }
});

test("a reentrant action already running retains ownership after the enclosing callback returns", async () => {
  const { directory, withSite } = await fixture();
  const entered = barrier(); const finish = barrier();
  let child!: Promise<void>;
  try {
    await withSite("ana-business", async () => {
      child = withSite("ana-business", async () => {
        entered.release(); await finish.promise;
        await withSite("ana-business", async () => undefined);
      });
      await entered.promise;
    });
    await assert.rejects(withSite("ana-business", async () => assert.fail("released while child is running")), BusinessSiteBusyError);
    finish.release(); await child;
    await withSite("ana-business", async () => undefined);
  } finally { finish.release(); await child; await rm(directory, { recursive: true, force: true }); }
});

test("independent processes cannot enter together; a live owner is not stolen by age", { timeout: 15_000 }, async () => {
  const { directory, withSite } = await fixture();
  const child = fork(resolve("scripts/business-publication-site-coordinator-child.mjs"), [directory], {
    execArgv: ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs"],
    stdio: ["ignore", "ignore", "pipe", "ipc"]
  });
  const ready = new Promise<void>((done, reject) => {
    child.once("message", (message) => message === "entered" ? done() : reject(new Error(String(message))));
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`child exited before barrier: ${code}`)));
  });
  const closed = new Promise<void>((done) => child.once("exit", () => done()));
  try {
    await ready;
    await assert.rejects(withSite("ana-business", async () => assert.fail("concurrent process entered")), BusinessSiteBusyError);
    child.send("release");
    await closed;
    assert.equal(await withSite("ana-business", async () => "after child"), "after child");
  } finally { if (child.exitCode === null) child.kill(); await closed; await rm(directory, { recursive: true, force: true }); }
});
