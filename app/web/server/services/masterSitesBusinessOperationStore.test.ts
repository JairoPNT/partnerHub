import assert from "node:assert/strict";
import { fork } from "node:child_process";
import fs from "node:fs/promises";
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createMasterSitesBusinessOperationStore } from "./masterSitesBusinessOperationStore.ts";

const requestId = "00000000-0000-4000-8000-000000000001";
const binding = {
  requestId, actorHash: "a".repeat(64), action: "PUBLISH" as const,
  activationLeadId: "00000000-0000-4000-8000-000000000002", siteId: "ana-business",
  templateId: "ganomaster-business" as const, expectedRevision: "b".repeat(64), updateExisting: false
};
const safeError = (code: string) => (error: unknown) => {
  assert.equal((error as { code: string }).code, code);
  assert.equal((error as Error).message, code);
  return true;
};
const result = {
  operationId: requestId, activationLeadId: binding.activationLeadId, siteId: binding.siteId,
  publicHost: "negocio.ana.example", outcome: "ENQUEUED" as const, job: null, blockedReasons: []
};

async function fixture(action: (directory: string, store: ReturnType<typeof createMasterSitesBusinessOperationStore>) => Promise<void>) {
  const directory = await mkdtemp(resolve(tmpdir(), "business-operation-store-"));
  try { await action(directory, createMasterSitesBusinessOperationStore({ directory })); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test("identical binding replays a durable initial operation across service instances", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "business-operation-store-"));
  try {
    const first = await createMasterSitesBusinessOperationStore({ directory }).create(binding);
    assert.equal(first.created, true);
    assert.equal(first.operation.version, 0);
    assert.equal(first.operation.phase, "PREPARED");
    assert.deepEqual(first.operation.binding, binding);
    const second = await createMasterSitesBusinessOperationStore({ directory }).create(binding);
    assert.equal(second.created, false);
    assert.deepEqual(second.operation, first.operation);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("each changed immutable binding conflicts without changing persisted bytes", async () => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const before = await readFile(resolve(directory, `${requestId}.json`), "utf8");
    for (const change of [
      { actorHash: "c".repeat(64) }, { action: "PREPARE_TARGET" },
      { activationLeadId: "00000000-0000-4000-8000-000000000003" },
      { siteId: "bea-business" }, { expectedRevision: "d".repeat(64) }, { updateExisting: true }
    ]) {
      await assert.rejects(store.create({ ...binding, ...change }), safeError("MASTER_SITES_OPERATION_CONFLICT"));
      assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), before);
    }
    await assert.rejects(store.create({ ...binding, templateId: "other-template" }), safeError("MASTER_SITES_OPERATION_INVALID"));
    assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), before);
    assert.deepEqual((await store.create(binding)).operation.binding, binding); // conflicting create released ownership
  });
});

test("CAS merges only validated hash pins, preserves binding and rejects stale or unsafe updates", async () => {
  await fixture(async (directory, store) => {
    const first = (await store.create(binding)).operation;
    const next = await store.checkpoint(requestId, 0, { phase: "GENERATED", pins: { sourceHash: "c".repeat(64), reviewedRevision: "b".repeat(64) } });
    assert.equal(next.version, 1);
    assert.equal(next.createdAt, first.createdAt);
    assert.deepEqual(next.binding, binding);
    const final = await store.checkpoint(requestId, 1, { phase: "ENQUEUED", pins: { jobId: "e".repeat(64) }, result });
    assert.equal(final.version, 2);
    assert.equal(final.pins.sourceHash, "c".repeat(64));
    assert.equal(final.pins.jobId, "e".repeat(64));
    const before = await readFile(resolve(directory, `${requestId}.json`), "utf8");
    await assert.rejects(store.checkpoint(requestId, 1, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_CONFLICT"));
    for (const patch of [
      {}, { version: 0 }, { binding }, { createdAt: first.createdAt }, { email: "secret@example.test" },
      { phase: "PUBLISHED" }, { pins: { sourceHash: "invalid" } }, { pins: { rawJwt: "secret" } },
      { result: { ...result, operationId: binding.activationLeadId } },
      { result: { ...result, activationLeadId: requestId } }, { result: { ...result, siteId: "bea-business" } },
      { result: { ...result, publicHost: "/remote/secret" } },
      { result: { ...result, blockedReasons: ["secret@example.test"] } },
      { result: { ...result, job: { id: "e".repeat(64), status: "QUEUED", phase: "QUEUED", attemptCount: 0, updatedAt: first.createdAt, rawToken: "secret" } } }
    ]) await assert.rejects(store.checkpoint(requestId, 2, patch), safeError("MASTER_SITES_OPERATION_INVALID"));
    assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), before);
    await assert.rejects(store.checkpoint(requestId, -1, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_INVALID"));
    assert.equal((await store.checkpoint(requestId, 2, { phase: "COMPLETE" })).version, 3);
  });
});

test("unsafe IDs, unknown binding fields and invalid hashes never construct record paths", async () => {
  await fixture(async (directory, store) => {
    for (const requestId of ["../outside", binding.requestId.toUpperCase().replace("000000000001", "ABCDEF000001"), "not-a-uuid", "constructor"] ) {
      await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_INVALID"));
      await assert.rejects(store.create({ ...binding, requestId }), safeError("MASTER_SITES_OPERATION_INVALID"));
    }
    for (const change of [{ actorHash: "raw-jwt" }, { expectedRevision: "f".repeat(65) }, { email: "private@example.test" }, { siteId: "../../foreign-business" }, { siteId: "ana-product" }, { activationLeadId: "invalid" }]) {
      await assert.rejects(store.create({ ...binding, ...change }), safeError("MASTER_SITES_OPERATION_INVALID"));
    }
    assert.deepEqual(await readdir(directory), []);
    assert.equal(await store.get(binding.requestId), null);
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_CONFLICT"));
  });
});

test("get returns clones and fails closed on truncated, foreign, oversized and unknown records", async () => {
  await fixture(async (directory, store) => {
    const created = (await store.create(binding)).operation;
    created.binding.siteId = "bea-business";
    created.pins.sourceHash = "d".repeat(64);
    const loaded = (await store.get(requestId))!;
    assert.equal(loaded.binding.siteId, "ana-business");
    assert.deepEqual(loaded.pins, {});
    loaded.binding.actorHash = "e".repeat(64);
    assert.equal((await store.get(requestId))!.binding.actorHash, "a".repeat(64));
    const valid = await readFile(resolve(directory, `${requestId}.json`), "utf8");
    for (const content of ["{", "x".repeat(20_000), JSON.stringify({ ...JSON.parse(valid), schemaVersion: 2 }), JSON.stringify({ ...JSON.parse(valid), operationId: binding.activationLeadId }), JSON.stringify({ ...JSON.parse(valid), rawJwt: "secret" })]) {
      await writeFile(resolve(directory, `${requestId}.json`), content);
      await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_CORRUPT"));
      await assert.rejects(store.create(binding), safeError("MASTER_SITES_OPERATION_CORRUPT"));
      assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), content);
    }
  });
});

test("independent requests proceed while orphan or malformed claims stay closed with no TTL stealing", async () => {
  await fixture(async (directory, store) => {
    const claim = resolve(directory, `${requestId}.lock`);
    await mkdir(claim);
    const marker = resolve(claim, "owner.json");
    for (const content of ["{", JSON.stringify({ token: binding.activationLeadId, acquiredAt: "2000-01-01T00:00:00.000Z", pid: 0 })]) {
      await writeFile(marker, content);
      await assert.rejects(store.create(binding), safeError("MASTER_SITES_OPERATION_BUSY"));
      assert.equal(await readFile(marker, "utf8"), content);
      assert.equal(await store.get(requestId), null);
    }
    assert.equal((await store.create({ ...binding, requestId: binding.activationLeadId })).created, true);
  });
});

test("symlinked directories and non-file records are rejected without following their targets", async () => {
  await fixture(async (directory, store) => {
    const outside = await mkdtemp(resolve(tmpdir(), "business-operation-foreign-"));
    const link = resolve(directory, "linked-root");
    try {
      await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
      const linked = createMasterSitesBusinessOperationStore({ directory: link });
      await assert.rejects(linked.create(binding), safeError("MASTER_SITES_OPERATION_STORAGE_ERROR"));
      assert.deepEqual(await readdir(outside), []);
      await mkdir(resolve(directory, `${requestId}.json`));
      await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_CORRUPT"));
    } finally { await rm(outside, { recursive: true, force: true }); }
  });
});

test("hardlinked records and symlinked record paths are rejected without changing foreign bytes", async () => {
  await fixture(async (directory, store) => {
    const foreign = resolve(directory, "foreign.json");
    const path = resolve(directory, `${requestId}.json`);
    await writeFile(foreign, "foreign-content");
    await link(foreign, path);
    await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_CORRUPT"));
    await assert.rejects(store.create(binding), safeError("MASTER_SITES_OPERATION_CORRUPT"));
    assert.equal(await readFile(foreign, "utf8"), "foreign-content");
    await rm(path);
    // Directory junctions are available without Windows developer mode/admin privileges.
    await symlink(directory, path, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_CORRUPT"));
    assert.equal(await readFile(foreign, "utf8"), "foreign-content");
  });
});

test("explicit undefined pins cannot erase an existing durable recovery pin", async () => {
  await fixture(async (_directory, store) => {
    await store.create(binding);
    await store.checkpoint(requestId, 0, { pins: { sourceHash: "c".repeat(64) } });
    await assert.rejects(store.checkpoint(requestId, 1, { pins: { sourceHash: undefined } }), safeError("MASTER_SITES_OPERATION_INVALID"));
    assert.equal((await store.get(requestId))!.pins.sourceHash, "c".repeat(64));
    assert.equal((await store.get(requestId))!.version, 1);
  });
});

test("default store uses only its configured output child and read does not initialize directories", async () => {
  const previous = process.env.PRODUCT_PAGE_OUTPUT_DIR;
  const directory = await mkdtemp(resolve(tmpdir(), "business-operation-output-"));
  try {
    process.env.PRODUCT_PAGE_OUTPUT_DIR = directory;
    const store = createMasterSitesBusinessOperationStore();
    assert.equal(await store.get(requestId), null);
    assert.deepEqual(await readdir(directory), []);
    await store.create(binding);
    assert.deepEqual(await readdir(directory), [".master-sites-business-operations"]);
    assert.equal((await store.get(requestId))!.operationId, requestId);
  } finally {
    if (previous === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR;
    else process.env.PRODUCT_PAGE_OUTPUT_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed atomic replacement preserves complete previous JSON and releases only its own lock", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const before = await readFile(resolve(directory, `${requestId}.json`), "utf8");
    const originalRename = fs.rename;
    const replacement = t.mock.method(fs, "rename", async () => { throw new Error("private-path-and-token"); });
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "GENERATING" }), safeError("MASTER_SITES_OPERATION_STORAGE_ERROR"));
    replacement.mock.restore();
    assert.equal(fs.rename, originalRename);
    assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), before);
    assert.equal((await store.checkpoint(requestId, 0, { phase: "GENERATED" })).version, 1);
    assert.deepEqual((await readdir(directory)).sort(), [`${requestId}.json`]);
  });
});

test("failed temporary write preserves prior record and cleans only the owned temporary file", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const before = await readFile(resolve(directory, `${requestId}.json`), "utf8");
    const open = fs.open.bind(fs);
    const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const file = await open(...args);
      if (String(args[0]).endsWith(".tmp")) t.mock.method(file, "writeFile", async () => { throw new Error("private write error"); });
      return file;
    });
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "GENERATING" }), safeError("MASTER_SITES_OPERATION_STORAGE_ERROR"));
    replacement.mock.restore();
    assert.equal(await readFile(resolve(directory, `${requestId}.json`), "utf8"), before);
    assert.deepEqual(await readdir(directory), [`${requestId}.json`]);
    assert.equal((await store.checkpoint(requestId, 0, { phase: "GENERATED" })).version, 1);
  });
});

test("readers observe complete old or new records during replacement, never temporary JSON", async (t) => {
  await fixture(async (_directory, store) => {
    await store.create(binding);
    const rename = fs.rename.bind(fs);
    const replacement = t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
      assert.equal((await store.get(requestId))!.version, 0);
      await rename(...args);
      assert.equal((await store.get(requestId))!.version, 1);
    });
    await store.checkpoint(requestId, 0, { phase: "GENERATED" });
    replacement.mock.restore();
  });
});

test("checkpoint rename between reader lstat and open returns retryable BUSY, not false corruption", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const writer = createMasterSitesBusinessOperationStore({ directory });
    const path = resolve(directory, `${requestId}.json`);
    const open = fs.open.bind(fs);
    let checkpointBeforeOpen = true;
    const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      if (String(args[0]) === path && checkpointBeforeOpen) {
        checkpointBeforeOpen = false;
        // Real writer creates/fsyncs/renames a complete version 1 after reader lstat(version 0).
        assert.equal((await writer.checkpoint(requestId, 0, { phase: "GENERATED" })).version, 1);
      }
      return open(...args);
    });
    await assert.rejects(store.get(requestId), (error: unknown) => {
      safeError("MASTER_SITES_OPERATION_BUSY")(error);
      assert.equal((error as { retryable: boolean }).retryable, true);
      return true;
    });
    replacement.mock.restore();
    assert.equal(checkpointBeforeOpen, false);
    assert.equal((await store.get(requestId))!.version, 1);
  });
});

test("modeled POSIX post-open detach returns BUSY before consuming any record bytes", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const path = resolve(directory, `${requestId}.json`);
    const open = fs.open.bind(fs);
    let reads = 0;
    const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const file = await open(...args);
      if (String(args[0]) === path) {
        const stat = file.stat.bind(file);
        // Model POSIX rename unlinking an already opened old inode before fstat.
        // This is an injected nlink observation, not an actual Linux execution/rename.
        t.mock.method(file, "stat", async () => Object.assign(await stat(), { nlink: 0 }));
        t.mock.method(file, "read", async () => { reads++; throw new Error("detached descriptor consumed"); });
      }
      return file;
    });
    await assert.rejects(store.get(requestId), (error: unknown) => {
      safeError("MASTER_SITES_OPERATION_BUSY")(error);
      assert.equal((error as { retryable: boolean }).retryable, true);
      return true;
    });
    replacement.mock.restore();
    assert.equal(reads, 0);
    assert.equal((await store.get(requestId))!.version, 0);
  });
});

test("post-open stat still rejects hardlinks, non-files and oversized detached records", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const path = resolve(directory, `${requestId}.json`);
    const open = fs.open.bind(fs);
    for (const change of [{ nlink: 2 }, { nlink: 0, size: 16_385 }, { nlink: 0, isFile: () => false }]) {
      let reads = 0;
      const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
        const file = await open(...args);
        if (String(args[0]) === path) {
          const stat = file.stat.bind(file);
          t.mock.method(file, "stat", async () => Object.assign(await stat(), change));
          t.mock.method(file, "read", async () => { reads++; throw new Error("unsafe descriptor consumed"); });
        }
        return file;
      });
      await assert.rejects(store.get(requestId), safeError("MASTER_SITES_OPERATION_CORRUPT"));
      replacement.mock.restore();
      assert.equal(reads, 0);
    }
  });
});

test("modeled POSIX detached owner descriptor stays OWNERSHIP_LOST and retains its claim", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const ownerPath = resolve(directory, `${requestId}.lock`, "owner.json");
    const open = fs.open.bind(fs);
    let reads = 0;
    const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const file = await open(...args);
      if (String(args[0]) === ownerPath && typeof args[1] === "number") {
        const stat = file.stat.bind(file);
        t.mock.method(file, "stat", async () => Object.assign(await stat(), { nlink: 0 }));
        t.mock.method(file, "read", async () => { reads++; throw new Error("detached owner consumed"); });
      }
      return file;
    });
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "GENERATED" }), (error: unknown) => {
      safeError("MASTER_SITES_OPERATION_OWNERSHIP_LOST")(error);
      assert.equal((error as { retryable: boolean }).retryable, false);
      return true;
    });
    replacement.mock.restore();
    assert.equal(reads, 0);
    assert.equal((await store.get(requestId))!.version, 0);
    assert.ok((await readdir(resolve(directory, `${requestId}.lock`))).includes("owner.json"));
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_BUSY"));
  });
});

test("owner marker inode replacement between lstat and open remains fail-closed OWNERSHIP_LOST", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const ownerPath = resolve(directory, `${requestId}.lock`, "owner.json");
    const foreignPath = resolve(directory, `${requestId}.lock`, "foreign.json");
    const open = fs.open.bind(fs);
    let replaceBeforeOpen = true;
    const replacement = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      if (String(args[0]) === ownerPath && typeof args[1] === "number" && replaceBeforeOpen) {
        replaceBeforeOpen = false;
        await writeFile(foreignPath, await readFile(ownerPath, "utf8"));
        await fs.rename(foreignPath, ownerPath);
      }
      return open(...args);
    });
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "GENERATED" }), (error: unknown) => {
      safeError("MASTER_SITES_OPERATION_OWNERSHIP_LOST")(error);
      assert.equal((error as { retryable: boolean }).retryable, false);
      return true;
    });
    replacement.mock.restore();
    assert.equal(replaceBeforeOpen, false);
    assert.equal((await store.get(requestId))!.version, 0);
    assert.ok((await readdir(resolve(directory, `${requestId}.lock`))).includes("owner.json"));
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_BUSY"));
  });
});

test("replaced or malformed owned markers fail closed and are never removed by the former owner", async (t) => {
  await fixture(async (directory, store) => {
    await store.create(binding);
    const rename = fs.rename.bind(fs);
    const ownerPath = resolve(directory, `${requestId}.lock`, "owner.json");
    const replacement = t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
      await rename(...args);
      await writeFile(ownerPath, "{foreign-marker");
    });
    await assert.rejects(store.checkpoint(requestId, 0, { phase: "GENERATED" }), safeError("MASTER_SITES_OPERATION_OWNERSHIP_LOST"));
    replacement.mock.restore();
    assert.equal(await readFile(ownerPath, "utf8"), "{foreign-marker");
    await assert.rejects(store.checkpoint(requestId, 1, { phase: "COMPLETE" }), safeError("MASTER_SITES_OPERATION_BUSY"));
  });
});

test("independent service instances serialize create and compare-and-swap", async () => {
  await fixture(async (directory, store) => {
    const other = createMasterSitesBusinessOperationStore({ directory });
    const creates = await Promise.allSettled([store.create(binding), other.create(binding)]);
    assert.equal(creates.filter((r) => r.status === "fulfilled" && r.value.created).length, 1);
    for (const r of creates) if (r.status === "rejected") safeError("MASTER_SITES_OPERATION_BUSY")(r.reason);
    const advances = await Promise.allSettled([store.checkpoint(requestId, 0, { phase: "GENERATED" }), other.checkpoint(requestId, 0, { phase: "GENERATING" })]);
    assert.equal(advances.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await store.get(requestId))!.version, 1);
  });
});

test("independent Node processes cannot both create or advance one request", { timeout: 15_000 }, async () => {
  await fixture(async (directory, store) => {
    async function race(mode: string) {
      const children = [0, 1].map(() => fork(resolve("scripts/master-sites-business-operation-store-child.mjs"), [directory, mode], {
        execArgv: ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs"], stdio: ["ignore", "ignore", "pipe", "ipc"]
      }));
      const exits = children.map((child) => new Promise<void>((done) => child.once("exit", () => done())));
      try {
        const ready = children.map((child) => new Promise<void>((done, reject) => {
          child.once("message", (m) => m === "ready" ? done() : reject(new Error(JSON.stringify(m))));
          child.once("error", reject); child.once("exit", () => reject(new Error("child exited before ready")));
        }));
        await Promise.all(ready);
        const results = children.map((child) => new Promise<{ created?: boolean; version?: number; error?: string }>((done) => child.once("message", done)));
        children.forEach((child) => child.send("start"));
        const values = await Promise.all(results);
        await Promise.all(exits);
        return values;
      } finally { children.forEach((child) => { if (child.exitCode === null) child.kill(); }); await Promise.all(exits); }
    }
    const creates = await race("create");
    assert.equal(creates.filter((r) => r.created).length, 1);
    for (const r of creates) if (r.error) assert.equal(r.error, "MASTER_SITES_OPERATION_BUSY");
    assert.equal((await store.get(requestId))!.version, 0);
    const advances = await race("checkpoint");
    assert.equal(advances.filter((r) => r.version === 1).length, 1);
    for (const r of advances) if (r.error) assert.ok(["MASTER_SITES_OPERATION_BUSY", "MASTER_SITES_OPERATION_CONFLICT"].includes(r.error));
    assert.equal((await store.get(requestId))!.version, 1);
  });
});

test("a paused independent process keeps ownership; process death leaves a closed orphan, never an automatic retry", { timeout: 15_000 }, async () => {
  await fixture(async (directory, store) => {
    for (const kill of [false, true]) {
      const child = fork(resolve("scripts/master-sites-business-operation-store-child.mjs"), [directory, "hold-create"], {
        execArgv: ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs"], stdio: ["ignore", "ignore", "pipe", "ipc"]
      });
      const closed = new Promise<void>((done) => child.once("exit", () => done()));
      const nextMessage = () => new Promise<unknown>((done, reject) => {
        child.once("message", done); child.once("error", reject);
        child.once("exit", () => reject(new Error("child exited before expected barrier")));
      });
      try {
        assert.equal(await nextMessage(), "ready");
        const entered = nextMessage(); child.send("start");
        assert.equal(await entered, "entered");
        assert.equal(await store.get(requestId), null); // no partially exposed initial record
        await assert.rejects(store.create(binding), safeError("MASTER_SITES_OPERATION_BUSY"));
        const independent = { ...binding, requestId: "00000000-0000-4000-8000-000000000004" };
        await store.create(independent);
        if (kill) {
          child.kill(); await closed;
          assert.equal(await store.get(requestId), null);
          await assert.rejects(store.create(binding), safeError("MASTER_SITES_OPERATION_BUSY"));
          assert.ok((await readdir(directory)).includes(`${requestId}.lock`));
        } else {
          const complete = nextMessage(); child.send("release");
          assert.deepEqual(await complete, { created: true }); await closed;
          assert.equal((await store.create(binding)).created, false);
          await rm(resolve(directory, `${requestId}.json`)); // start the separate orphan scenario
        }
      } finally { if (child.exitCode === null) child.kill(); await closed; }
    }
  });
});
