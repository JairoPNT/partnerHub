import { createHash } from "node:crypto";
import { access, lstat, readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const REQUEST_ID = "CDX-20260910-003";
const SITE_ID = "ganomaster-personal-brand";
const ECOSYSTEM_TYPE = "PERSONAL_BRAND";
const PUBLIC_HOST = "brand.ganomaster.pro";
const REQUIRED_TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const PACKAGE_FILES = [".htaccess", ...REQUIRED_TEMPLATE_FILES, "manifest.json"];
const NO_CACHE_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

const exists = async (path) => access(path).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("PERSONAL_BRAND_LOCAL_PATH_ESCAPE");
  return target;
}

function inventoryHash(entries) {
  return sha256(JSON.stringify(entries.map(({ path, hash }) => ({ path, hash }))));
}

async function inventory(directory) {
  if (!(await exists(directory))) return { exists: false, files: [], hash: "ABSENT" };
  const files = [];

  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = inside(directory, relative(directory, resolve(current, entry.name)));
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({
        path: relative(directory, path).split(sep).join("/"),
        hash: sha256(await readFile(path))
      });
      else throw new Error("PERSONAL_BRAND_MASTER_PACKAGE_SPECIAL_FILE_FORBIDDEN");
    }
  }

  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { exists: true, files, hash: inventoryHash(files) };
}

function validateCanonicalConfig(bytes) {
  const config = new vm.Script(`${bytes.toString("utf8")}\n;CONFIG;`).runInNewContext(Object.create(null), { timeout: 1000 });
  if (
    config?.ecosystemType !== ECOSYSTEM_TYPE
    || config?.site?.id !== SITE_ID
    || config?.site?.appName !== SITE_ID
  ) {
    throw new Error("PERSONAL_BRAND_CANONICAL_TEMPLATE_IDENTITY_INVALID");
  }
}

async function loadCanonicalTemplate(templateDirectory) {
  const entries = [];
  const bytesByName = new Map();
  for (const name of REQUIRED_TEMPLATE_FILES) {
    const path = inside(templateDirectory, name);
    const metadata = await lstat(path);
    if (!metadata.isFile()) throw new Error("PERSONAL_BRAND_CANONICAL_TEMPLATE_SPECIAL_FILE_FORBIDDEN");
    const bytes = await readFile(path);
    bytesByName.set(name, bytes);
    entries.push({ path: name, hash: sha256(bytes) });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  validateCanonicalConfig(bytesByName.get("config.js"));
  return { bytesByName, files: entries, hash: inventoryHash(entries) };
}

function buildExpectedPackage(template) {
  const bytesByName = new Map(template.bytesByName);
  bytesByName.set(".htaccess", Buffer.from(NO_CACHE_HTACCESS, "utf8"));
  const manifest = {
    schemaVersion: 1,
    siteId: SITE_ID,
    ecosystemType: ECOSYSTEM_TYPE,
    publicHost: PUBLIC_HOST,
    source: "CANONICAL_PERSONAL_BRAND_TEMPLATE",
    canonicalTemplateHash: template.hash,
    files: [...REQUIRED_TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  bytesByName.set("manifest.json", Buffer.from(json(manifest), "utf8"));
  const files = [...bytesByName.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { files, hash: inventoryHash(files) };
}

function resolvePaths(options = {}) {
  const outputRoot = resolve(options.outputRoot ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/personal-brand");
  return {
    destinationDirectory: inside(outputRoot, SITE_ID),
    templateDirectory
  };
}

async function isDirectory(path) {
  return stat(path).then((value) => value.isDirectory(), () => false);
}

export async function planPersonalBrandMasterPackage(options = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  let template = { files: [], hash: "INVALID" };
  let expectedPackage = { files: [], hash: "INVALID" };
  try {
    template = await loadCanonicalTemplate(paths.templateDirectory);
    expectedPackage = buildExpectedPackage(template);
  } catch (error) {
    reasons.push(error instanceof Error && error.message.startsWith("PERSONAL_BRAND_")
      ? error.message
      : "PERSONAL_BRAND_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE");
  }

  let destination = { exists: false, files: [], hash: "ABSENT" };
  try {
    destination = await inventory(paths.destinationDirectory);
  } catch {
    reasons.push("PERSONAL_BRAND_MASTER_PACKAGE_DRIFT");
  }
  const typographyDirectoryPresent = await isDirectory(inside(paths.destinationDirectory, "tipografia"));
  if (destination.exists && (destination.hash !== expectedPackage.hash || !typographyDirectoryPresent)) {
    reasons.push("PERSONAL_BRAND_MASTER_PACKAGE_DRIFT");
  }

  const material = {
    requestId: REQUEST_ID,
    operation: "CREATE_CANONICAL_PERSONAL_BRAND_MASTER_PACKAGE",
    identity: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    canonicalTemplateHash: template.hash,
    canonicalTemplateFiles: template.files,
    expectedPackageHash: expectedPackage.hash,
    expectedPackageFiles: expectedPackage.files,
    destinationHash: destination.hash
  };
  const alreadyCurrent = destination.exists
    && destination.hash === expectedPackage.hash
    && typographyDirectoryPresent;

  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    disposition: alreadyCurrent ? "ALREADY_CURRENT" : "CREATE_LOCAL_MASTER_PACKAGE",
    destination: { present: destination.exists, hash: destination.hash, typographyDirectoryPresent },
    safety: {
      providerCallsMade: false,
      sftpAdapterCreated: false,
      localWritesMade: false,
      partnerPackagesMutable: false
    }
  };
}

export async function runJairoPersonalBrandMasterPackage(options = {}) {
  return planPersonalBrandMasterPackage(options);
}

async function main() {
  process.stdout.write(json(await runJairoPersonalBrandMasterPackage()));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(json({ error: error instanceof Error ? error.message : "PERSONAL_BRAND_MASTER_PACKAGE_PREVIEW_FAILED" }));
    process.exitCode = 1;
  });
}
