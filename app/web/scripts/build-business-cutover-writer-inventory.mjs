// Build-time reader of the FINAL flattened Docker layout. No caller roots,
// release/profile/hash options, environment approvals, or TypeScript runtime.
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve("/app");
const excluded = new Set(["runtime-assets/business-cutover-writer-inventory.json", "scripts/business-consent-cutover.mjs"]);
const pins = Object.freeze({
  "app.js": "fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de",
  "config.js": "ebfd341347e16651b130fb7be284326e728e17d1d793abe9877720d8e86847d0",
  "favicon.svg": "d0736575f83d7a107dd4368d1bb5b89d0baa8a3fff1ede5f4b1ea2a38151532e",
  "index.html": "39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb",
  "measurement-runtime.js": "78db567bbd5e6ab30aa9e2402bfa421aa043a7bad11ea046d56ef79df0dccf42",
  "styles.css": "302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59",
});
const predecessorPins = Object.freeze({
  "app.js": "5013e2523bb6dc69a5f886d201c034a182b06b8a346cf81f85b7e950263d30d9",
  "config.js": "f56ec79877aef16355e29412f51640bda7c87895de06ef93f44c8add6de3ab32",
  "favicon.svg": "d0736575f83d7a107dd4368d1bb5b89d0baa8a3fff1ede5f4b1ea2a38151532e",
  "index.html": "071de9f77243e47cf54264c8349e57658d90d127128755f5eafb0328143f1b9d",
  "styles.css": "6fe6fa47c1a836b0f1108c572fa16000d46b3f80f387118df095aeaac9b54fa2",
});
const required = ["server.js", "package.json", "package-lock.json", "node_modules/next/package.json",
  "scripts/node_modules/ssh2-sftp-client/package.json", "runtime-assets/jairo-business-in-process-provisioner.mjs",
  "runtime-assets/jairo-business-package-generator.mjs", "runtime-assets/product-mutation-coordinator.mjs",
  "runtime-assets/business-config.js", "scripts/business-consent-master-package-migration.mjs",
  "scripts/business-cutover-maintenance.mjs", "scripts/business-master-transition-lifecycle.mjs"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const invalid = () => { throw new Error("BUSINESS_CUTOVER_PROFILE_INVALID"); };
const unavailable = () => { throw new Error("BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"); };
const identity = (s) => [s.dev, s.ino, s.mode, s.nlink, s.size, s.mtimeNs, s.ctimeNs].map(String).join(":");
const safePath = (path) => typeof path === "string" && path.length <= 4096 &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== ".." && !/[\\\x00-\x1f\x7f:]/.test(part));

/** Strict wire-format parser; data is metadata, never an approval capability. */
export function validateBusinessCutoverWriterInventory(value) {
  const exact = (v, keys) => v && typeof v === "object" && !Array.isArray(v) &&
    JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...keys].sort());
  if (!exact(value, ["version", "releaseId", "files"]) || value.version !== 1 ||
    !["business-consent-predecessor-v1", "business-consent-successor-v1"].includes(value.releaseId) ||
    !Array.isArray(value.files) || !value.files.length) invalid();
  let previous = "";
  for (const row of value.files) {
    if (!exact(row, ["path", "sha256", "size"]) || !safePath(row.path) || excluded.has(row.path) || row.path <= previous ||
      typeof row.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.size) || row.size < 0) invalid();
    previous = row.path;
  }
  return value;
}

/** Must run after copying ALL final writer/dependency bytes to /app, before
 * building the self-contained administrative CLI. Catch ONLY ARTIFACTS_UNAVAILABLE
 * in packaging to compile an unavailable descriptor; PROFILE_INVALID fails build.
 * No inventory/hash certifies external image provenance or task retirement.
 */
export async function buildBusinessCutoverWriterInventory() {
  const files = [], directories = [], filePins = [], ancestors = [], contents = new Map();
  async function visit(directory, prefix = "") {
    const before = await lstat(directory, { bigint: true });
    if (!before.isDirectory() || before.isSymbolicLink() || (process.platform !== "win32" && (before.mode & 0o022n))) invalid();
    const names = (await readdir(directory)).sort();
    for (const name of names) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!safePath(path)) invalid();
      const absolute = resolve(directory, name), stat = await lstat(absolute, { bigint: true });
      if (stat.isSymbolicLink()) invalid();
      if (stat.isDirectory()) await visit(absolute, path);
      else {
        if (!stat.isFile() || stat.nlink !== 1n || (process.platform !== "win32" && (stat.mode & 0o022n))) invalid();
        if (excluded.has(path)) continue;
        const fd = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        let bytes;
        try {
          if (identity(await fd.stat({ bigint: true })) !== identity(stat)) invalid();
          bytes = await fd.readFile();
          if (identity(await fd.stat({ bigint: true })) !== identity(stat)) invalid();
        } finally { await fd.close(); }
        if (identity(await lstat(absolute, { bigint: true })) !== identity(stat)) invalid();
        filePins.push({ path: absolute, stat });
        files.push({ path, sha256: hash(bytes), size: bytes.length });
        if (path === "runtime-assets/business-config.js" || path.startsWith("plantillas-de-pagina/business/") || path.startsWith("runtime-assets/business-consent-successor/")) contents.set(path, bytes);
      }
    }
    if (identity(await lstat(directory, { bigint: true })) !== identity(before) || JSON.stringify(await readdir(directory).then((v) => v.sort())) !== JSON.stringify(names)) invalid();
    directories.push({ directory, stat: before, prefix });
  }
  try {
    // Recheck CURRENT ancestors; no prior overlay identity is required.
    let current = root;
    for (;;) {
      const stat = await lstat(current, { bigint: true });
      if (!stat.isDirectory() || stat.isSymbolicLink()) invalid();
      ancestors.push({ path: current, stat });
      if (dirname(current) === current) break;
      current = dirname(current);
    }
    await visit(root);
    const has = (name) => files.some((row) => row.path === name);
    const need = (name) => { if (!has(name)) unavailable(); };
    // Present reviewed inputs with wrong bytes always fail, even if another
    // dependent input is absent. Missing staging never blesses a different file.
    for (const [name, expected] of Object.entries(pins)) {
      const bytes = contents.get(`runtime-assets/business-consent-successor/${name}`);
      if (bytes && hash(bytes) !== expected) invalid();
    }
    const staged = [...contents.keys()].filter((p) => p.startsWith("runtime-assets/business-consent-successor/"));
    if (staged.some((p) => !Object.hasOwn(pins, p.slice("runtime-assets/business-consent-successor/".length)))) invalid();
    if (directories.some(({ prefix }) => prefix.startsWith("runtime-assets/business-consent-successor/"))) invalid();
    const canonical = [...contents.keys()].filter((p) => p.startsWith("plantillas-de-pagina/business/") && !p.slice("plantillas-de-pagina/business/".length).includes("/"));
    const rows = canonical.map((path) => ({ path: path.slice("plantillas-de-pagina/business/".length), hash: hash(contents.get(path)) })).sort((a, b) => a.path.localeCompare(b.path));
    const candidates = [predecessorPins, pins].filter((profile) => rows.every((row) => profile[row.path] === row.hash));
    if (!candidates.length) invalid();
    const runtimeConfig = contents.get("runtime-assets/business-config.js");
    if (runtimeConfig) {
      const runtimeHash = hash(runtimeConfig), canonicalConfig = contents.get("plantillas-de-pagina/business/config.js");
      if (!candidates.some((profile) => profile["config.js"] === runtimeHash) ||
        (canonicalConfig && !runtimeConfig.equals(canonicalConfig))) invalid();
    }
    if (!candidates.some((profile) => Object.keys(profile).length === rows.length)) unavailable();
    const templateHash = hash(JSON.stringify(rows));
    let releaseId;
    if (templateHash === "b3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99") releaseId = "business-consent-predecessor-v1";
    else if (templateHash === "0a7fdec9a7d51c022db7dc5d1e2eeca4cce1f1d3aea7a00ebc1cf358b1e0f63e") releaseId = "business-consent-successor-v1";
    else invalid();
    // PREDECESSOR needs the reviewed successor staging for a future migration.
    // SUCCESSOR derives its six reviewed bytes from canonical, not an old overlay.
    if (releaseId === "business-consent-predecessor-v1" || staged.length) {
      for (const name of Object.keys(pins)) need(`runtime-assets/business-consent-successor/${name}`);
    }
    for (const name of required) need(name);
    if (!files.some((row) => row.path.startsWith(".next/server/")) || !files.some((row) => row.path.startsWith(".next/static/"))) unavailable();
    for (const { directory, stat } of directories) if (identity(await lstat(directory, { bigint: true })) !== identity(stat)) invalid();
    for (const { path, stat } of filePins) if (identity(await lstat(path, { bigint: true })) !== identity(stat)) invalid();
    for (const { path, stat } of ancestors) {
      const current = await lstat(path, { bigint: true });
      if (!current.isDirectory() || current.isSymbolicLink() || ["dev", "ino", "mode"].some((key) => current[key] !== stat[key])) invalid();
    }
    files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return validateBusinessCutoverWriterInventory({ version: 1, releaseId, files });
  } catch (error) {
    if (error?.code === "ENOENT") unavailable();
    if (["BUSINESS_CUTOVER_PROFILE_INVALID", "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"].includes(error?.message)) throw error;
    invalid();
  }
}
