import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { inspectBusinessGlobalClosure } from "@/server/services/businessCutoverClaimStore";

type Identity = Pick<BigIntStats, "dev" | "ino" | "birthtimeNs">;
type DirectoryPin = { path: string; identity: Identity };
type Ownership = { token: string; references: number; marker: Identity; directories: DirectoryPin[] };
type Scope = { owner: Ownership; active: boolean };
// Module-private capability: callers can neither submit nor restore ownership from HTTP/JSON.
const context = new AsyncLocalStorage<Map<string, Scope>>();
const same = (left: Identity, right: Identity) => left.dev === right.dev && left.ino === right.ino && left.birthtimeNs === right.birthtimeNs;

export class BusinessSiteBusyError extends Error {
  constructor() { super("BUSINESS_SITE_BUSY"); this.name = "BusinessSiteBusyError"; }
}

export function isBusinessPublicationSiteId(siteId: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-business$/.test(siteId);
}

export function assertBusinessPublicationSiteIdentity(siteId: string, ecosystemType: unknown) {
  if (ecosystemType === "BUSINESS" && !isBusinessPublicationSiteId(siteId)) {
    throw new Error("BUSINESS_SITE_IDENTITY_INVALID");
  }
}

// A claimed background job is a new operation, even when woken from inside a manual action.
export function withoutBusinessPublicationSiteOwnership<T>(action: () => Promise<T>): Promise<T> {
  return context.exit(action);
}

async function directoryIdentity(path: string) {
  const info = await lstat(path, { bigint: true });
  if (!info.isDirectory() || info.isSymbolicLink() || info.ino === 0n) throw new BusinessSiteBusyError();
  return info;
}

async function directoryPins(path: string): Promise<DirectoryPin[]> {
  const parent = dirname(path);
  return [...(parent === path ? [] : await directoryPins(parent)), { path, identity: await directoryIdentity(path) }];
}

// Cooperative private-volume protocol, like Product: detect static path/token/physical
// substitutions. Node has no portable openat/dirfd unlink; hostile same-UID/root races
// require filesystem isolation, not a lease, PID probe or automatic orphan cleanup.
export function createBusinessPublicationSiteCoordinator(options: { outputDirectory?: string } = {}) {
  return async function withBusinessPublicationSite<T>(siteId: string, action: () => Promise<T>): Promise<T> {
    assertBusinessPublicationSiteIdentity(siteId, "BUSINESS");
    const output = resolve(options.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
    const root = resolve(output, ".business-publication-site-claims");
    const claim = resolve(root, createHash("sha256").update(siteId).digest("hex"));
    const ownerPath = resolve(claim, "owner.json");
    const owns = async (owner: Ownership) => {
      try {
        for (const pin of owner.directories) if (!same(await directoryIdentity(pin.path), pin.identity)) return false;
        const marker = await lstat(ownerPath, { bigint: true });
        if (!marker.isFile() || marker.isSymbolicLink() || marker.nlink !== 1n || marker.size > 4096n || !same(marker, owner.marker)) return false;
        const handle = await open(ownerPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        try {
          const opened = await handle.stat({ bigint: true });
          if (!same(opened, owner.marker) || opened.nlink !== 1n || opened.size > 4096n) return false;
          if (JSON.parse(await handle.readFile("utf8")).token !== owner.token) return false;
          const after = await handle.stat({ bigint: true });
          if (!same(after, owner.marker) || after.nlink !== 1n || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs) return false;
        } finally { await handle.close(); }
        const current = await lstat(ownerPath, { bigint: true });
        if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1n || !same(current, owner.marker)) return false;
        if (JSON.stringify(await readdir(claim)) !== '["owner.json"]') return false;
        for (const pin of owner.directories) if (!same(await directoryIdentity(pin.path), pin.identity)) return false;
        return true;
      }
      catch { return false; }
    };
    const assertGlobalOpen = async () => {
      try { if (await inspectBusinessGlobalClosure(output) === "OPEN") return; }
      catch { /* Unsafe traversal is closed, with the existing worker-compatible error. */ }
      throw new BusinessSiteBusyError();
    };
    const inherited = context.getStore();
    const previous = inherited?.get(claim);
    const runOwned = async (owner: Ownership, fresh: boolean) => {
      const scope = { owner, active: true };
      const owned = new Map(inherited);
      owned.set(claim, scope);
      try {
        // An already-running reference may drain under closure; only fresh claims
        // perform the second global check. finally removes only our proven claim.
        if (fresh) await assertGlobalOpen();
        if (!await owns(owner)) throw new BusinessSiteBusyError();
        return await context.run(owned, action);
      } finally {
        scope.active = false;
        owner.references--;
        // Detached work which already entered owns a reference of its own; expired scopes
        // cannot start new reentrant work. Only the last active action releases the claim.
        if (owner.references === 0 && await owns(owner)) {
          await unlink(ownerPath);
          await rmdir(claim);
        }
      }
    };
    if (previous?.active) {
      previous.owner.references++;
      return runOwned(previous.owner, false);
    }
    await assertGlobalOpen();
    await mkdir(output, { recursive: true });
    await directoryPins(output);
    await mkdir(root, { recursive: true, mode: 0o700 });
    const ancestors = await directoryPins(root);
    try { await mkdir(claim, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new BusinessSiteBusyError();
      throw error;
    }
    const directories = [...ancestors, { path: claim, identity: await directoryIdentity(claim) }];
    const token = randomUUID();
    // Atomic directory creation is the claim. Incomplete/corrupt/orphan claims remain closed.
    // No age/lease/TTL allows stealing; recovery requires explicitly proving the owner stopped.
    const handle = await open(ownerPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
    let marker: BigIntStats;
    try {
      await handle.writeFile(JSON.stringify({ token, siteId, pid: process.pid, acquiredAt: new Date().toISOString() }));
      marker = await handle.stat({ bigint: true });
    } finally { await handle.close(); }
    return runOwned({ token, references: 1, marker, directories }, true);
  };
}

export const withBusinessPublicationSite = createBusinessPublicationSiteCoordinator();
