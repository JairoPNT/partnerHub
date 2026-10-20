import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { lstat, mkdir, open, rmdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const PRODUCT_MUTATION_COORDINATION_VERSION = "product-mutation-v1";
type Identity = Pick<Stats, "dev" | "ino">;
type Ownership = { token: string; references: number; marker: Identity; directory: Identity; root: Identity };
type Scope = { owner: Ownership; active: boolean };
const context = new AsyncLocalStorage<Map<string, Scope>>();
const same = (left: Identity, right: Identity) => left.dev === right.dev && left.ino === right.ino;

// Trust boundary: this private namespace belongs to cooperating application writers.
// Static symlink/type/inode/token changes fail closed, but Node pathname operations
// cannot guarantee race-free unlink against a privileged/same-UID process replacing
// paths between validation and removal. Do not grant untrusted write access here.
export class ProductMutationBusyError extends Error {
  readonly code = "PRODUCT_MUTATION_BUSY";
  constructor() { super("PRODUCT_MUTATION_BUSY"); this.name = "ProductMutationBusyError"; }
}
export function withoutProductMutationOwnership<T>(action: () => Promise<T>): Promise<T> { return context.exit(action); }

// Unknown IDs must be gated before reading their mutable source/target. Explicit Brand
// and Business callers retain their existing behavior; Product is never inferred by suffix.
export function needsProductMutation(siteId: string, ecosystemType?: unknown) {
  if (["ganomaster", "ganomaster-business", "ganomaster-personal-brand"].includes(siteId)) return false;
  if (ecosystemType === "PRODUCT") return true;
  if (ecosystemType === "BUSINESS" || ecosystemType === "PERSONAL_BRAND") return false;
  return !/^[a-z0-9]+(?:-[a-z0-9]+)*-business$/.test(siteId);
}

async function directoryIdentity(path: string): Promise<Stats> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new ProductMutationBusyError();
  return info;
}

async function safeAncestors(path: string) {
  const parent = dirname(path);
  if (parent !== path) await safeAncestors(parent);
  await directoryIdentity(path);
}

export function createProductMutationCoordinator(options: { outputDirectory?: string } = {}) {
  return async function withProductMutation<T>(siteId: string, action: () => Promise<T>): Promise<T> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteId)) throw new Error("PRODUCT_MUTATION_SITE_ID_INVALID");
    const output = resolve(options.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
    const root = resolve(output, ".product-mutation-claims");
    const claim = resolve(root, createHash("sha256").update(siteId).digest("hex"));
    const ownerPath = resolve(claim, "owner.json");
    const owns = async (owner: Ownership) => {
      try {
        await safeAncestors(output);
        if (!same(await directoryIdentity(root), owner.root) || !same(await directoryIdentity(claim), owner.directory)) return false;
        const marker = await lstat(ownerPath);
        if (!marker.isFile() || marker.isSymbolicLink() || marker.nlink !== 1 || marker.size > 4096 || !same(marker, owner.marker)) return false;
        const handle = await open(ownerPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        try {
          const opened = await handle.stat();
          if (!same(opened, owner.marker) || opened.nlink !== 1) return false;
          return JSON.parse(await handle.readFile("utf8")).token === owner.token;
        } finally { await handle.close(); }
      } catch { return false; }
    };
    const inherited = context.getStore();
    const previous = inherited?.get(claim);
    const runOwned = async (owner: Ownership) => {
      const scope = { owner, active: true }; const owned = new Map(inherited); owned.set(claim, scope);
      try {
        if (!await owns(owner)) throw new ProductMutationBusyError();
        return await context.run(owned, action);
      } finally {
        scope.active = false;
        owner.references--;
        // No TTL, PID probing or orphan deletion. A live detached nested operation keeps
        // its own reference; an expired async scope grants no capability to new work.
        if (owner.references === 0 && await owns(owner)) {
          await unlink(ownerPath);
          await rmdir(claim);
        }
      }
    };
    if (previous?.active) { previous.owner.references++; return runOwned(previous.owner); }
    await mkdir(output, { recursive: true });
    await safeAncestors(output);
    await mkdir(root, { recursive: true, mode: 0o700 });
    const rootIdentity = await directoryIdentity(root);
    try { await mkdir(claim, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ProductMutationBusyError();
      throw error;
    }
    const directory = await directoryIdentity(claim);
    const token = randomUUID();
    // An incomplete claim is deliberately left closed if marker creation fails.
    const handle = await open(ownerPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
    let marker: Stats;
    try {
      await handle.writeFile(JSON.stringify({ token, siteId, acquiredAt: new Date().toISOString() }));
      marker = await handle.stat();
    } finally { await handle.close(); }
    return runOwned({ token, references: 1, marker, directory, root: rootIdentity });
  };
}
export const withProductMutation = createProductMutationCoordinator();
