import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Ownership = { token: string; references: number };
type Scope = { owner: Ownership; active: boolean };
// Module-private capability: callers can neither submit nor restore ownership from HTTP/JSON.
const context = new AsyncLocalStorage<Map<string, Scope>>();

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

export function createBusinessPublicationSiteCoordinator(options: { outputDirectory?: string } = {}) {
  return async function withBusinessPublicationSite<T>(siteId: string, action: () => Promise<T>): Promise<T> {
    assertBusinessPublicationSiteIdentity(siteId, "BUSINESS");
    const root = resolve(options.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites",
      ".business-publication-site-claims");
    const claim = resolve(root, createHash("sha256").update(siteId).digest("hex"));
    const ownerPath = resolve(claim, "owner.json");
    const owns = async (owner: Ownership) => {
      try { return JSON.parse(await readFile(ownerPath, "utf8")).token === owner.token; }
      catch { return false; }
    };
    const inherited = context.getStore();
    const previous = inherited?.get(claim);
    const runOwned = async (owner: Ownership, validate: boolean) => {
      const scope = { owner, active: true };
      const owned = new Map(inherited);
      owned.set(claim, scope);
      try {
        if (validate && !await owns(owner)) throw new BusinessSiteBusyError();
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
      return runOwned(previous.owner, true);
    }
    await mkdir(root, { recursive: true, mode: 0o700 });
    try { await mkdir(claim, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new BusinessSiteBusyError();
      throw error;
    }
    const owner = { token: randomUUID(), references: 1 };
    // Atomic directory creation is the claim. Incomplete/corrupt/orphan claims remain closed.
    // No age/lease/TTL allows stealing; recovery requires explicitly proving the owner stopped.
    await writeFile(ownerPath, JSON.stringify({ token: owner.token, siteId, pid: process.pid, acquiredAt: new Date().toISOString() }),
      { flag: "wx", mode: 0o600 });
    return runOwned(owner, false);
  };
}

export const withBusinessPublicationSite = createBusinessPublicationSiteCoordinator();
