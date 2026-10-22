import "server-only";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve } from "node:path";
import { buildBusinessCutoverWriterInventory, validateBusinessCutoverWriterInventory } from "../../scripts/build-business-cutover-writer-inventory.mjs";

export type CutoverReleaseId = "business-consent-predecessor-v1" | "business-consent-successor-v1";
type Descriptor = Readonly<{ version: 1; releaseId: CutoverReleaseId; inventorySha256: string }>;
declare const __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: unknown;
// Replaced ONLY by the reviewed build after final writer assembly. Undefined
// is the ordinary incomplete-composition build, never a provisional approval.
const compiled = typeof __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__ === "undefined" ? null : __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__;
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const invalid = () => new Error("BUSINESS_CUTOVER_PROFILE_INVALID");
const unavailable = () => new Error("BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE");

function descriptor(): Descriptor | null {
  if (compiled === null) return null;
  if (typeof compiled !== "object" || Array.isArray(compiled) ||
    JSON.stringify(Object.keys(compiled).sort()) !== '["inventorySha256","releaseId","version"]') throw invalid();
  const d = compiled as Descriptor;
  if (d.version !== 1 || !["business-consent-predecessor-v1", "business-consent-successor-v1"].includes(d.releaseId) ||
    typeof d.inventorySha256 !== "string" || !/^[0-9a-f]{64}$/.test(d.inventorySha256)) throw invalid();
  return d;
}

/** Compile-time metadata only: not proof of installed bytes or provenance. */
export function readBusinessCutoverReleaseProfile(): Readonly<{ status: "UNAVAILABLE" }> | Readonly<{ status: "AVAILABLE"; releaseId: CutoverReleaseId; inventorySha256: string }> {
  const d = descriptor();
  return d ? Object.freeze({ status: "AVAILABLE", releaseId: d.releaseId, inventorySha256: d.inventorySha256 }) : Object.freeze({ status: "UNAVAILABLE" });
}

/** Local integrity + fixed reviewed template semantics. External reviewed-image
 * provenance, host writers and task retirement remain operational BEGIN gates;
 * a newly self-inventoried image does not establish any of them.
 */
export async function inspectBusinessCutoverReleaseProfile(): Promise<Readonly<{ releaseId: CutoverReleaseId; inventorySha256: string }>> {
  const d = descriptor(); if (!d) throw unavailable();
  try {
    const path = resolve("/app/runtime-assets/business-cutover-writer-inventory.json");
    const stat = await lstat(path, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size > 64n * 1024n * 1024n ||
      (process.platform !== "win32" && (stat.mode & 0o022n))) throw invalid();
    const identity = (s: typeof stat) => [s.dev, s.ino, s.size, s.mode, s.nlink, s.mtimeNs, s.ctimeNs].map(String).join(":");
    const fd = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let bytes: Buffer;
    try {
      if (identity(await fd.stat({ bigint: true })) !== identity(stat)) throw invalid();
      bytes = await fd.readFile();
      if (identity(await fd.stat({ bigint: true })) !== identity(stat)) throw invalid();
    } finally { await fd.close(); }
    if (hash(bytes) !== d.inventorySha256) throw invalid();
    const inventory = validateBusinessCutoverWriterInventory(JSON.parse(bytes.toString("utf8")));
    if (!Buffer.from(JSON.stringify(inventory)).equals(bytes) || inventory.releaseId !== d.releaseId) throw invalid();
    const installed = await buildBusinessCutoverWriterInventory();
    if (JSON.stringify(installed) !== bytes.toString("utf8") || identity(await lstat(path, { bigint: true })) !== identity(stat)) throw invalid();
    return Object.freeze({ releaseId: d.releaseId, inventorySha256: d.inventorySha256 });
  } catch (error) {
    if (error instanceof Error && ["BUSINESS_CUTOVER_PROFILE_INVALID", "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"].includes(error.message)) throw error;
    throw unavailable();
  }
}
