import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import process from "node:process";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE";
export const APPLY_CONFIRMATION = "CREATE_CANONICAL_GANOMASTER_BUSINESS_PACKAGE";

const REQUEST_ID = "CDX-20260827-002";
const SITE_ID = "ganomaster-business";
const ECOSYSTEM_TYPE = "BUSINESS";
const PUBLIC_HOST = "business.ganomaster.pro";
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
  if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE");
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
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({
        path: relative(directory, path).split(sep).join("/"),
        hash: sha256(await readFile(path))
      });
      else throw new Error("BUSINESS_MASTER_PACKAGE_SPECIAL_FILE_FORBIDDEN");
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { exists: true, files, hash: inventoryHash(files) };
}

function validateCanonicalConfig(bytes) {
  const text = bytes.toString("utf8");
  const config = new vm.Script(`${text}\n;CONFIG;`).runInNewContext(Object.create(null), { timeout: 1000 });
  if (config?.ecosystemType !== ECOSYSTEM_TYPE || config?.site?.id !== SITE_ID) {
    throw new Error("BUSINESS_CANONICAL_TEMPLATE_IDENTITY_INVALID");
  }
  if (config?.site?.appName !== SITE_ID) throw new Error("BUSINESS_CANONICAL_TEMPLATE_APP_NAME_INVALID");
  for (const key of ["brandName", "firstName", "fullName", "role", "whatsappNumber", "phoneNumber", "displayPhone", "ctaUrl", "defaultMessage"]) {
    if (config?.distributor?.[key] !== "") throw new Error(`BUSINESS_CANONICAL_MASTER_DISTRIBUTOR_NOT_EMPTY:${key}`);
  }
  for (const key of ["primaryUrl", "secondaryUrl", "directRegisterUrl"]) {
    if (config?.cta?.[key] !== "") throw new Error(`BUSINESS_CANONICAL_MASTER_CTA_NOT_EMPTY:${key}`);
  }
  if (config?.vsl?.provider !== "custom" || !String(config?.vsl?.embedUrl ?? "").endsWith(".mp4")) {
    throw new Error("BUSINESS_CANONICAL_MASTER_VSL_INVALID");
  }
}

async function loadCanonicalTemplate(templateDirectory) {
  const entries = [];
  const bytesByName = new Map();
  for (const name of REQUIRED_TEMPLATE_FILES) {
    const bytes = await readFile(inside(templateDirectory, name));
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
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash: template.hash,
    files: [...REQUIRED_TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  bytesByName.set("manifest.json", Buffer.from(json(manifest), "utf8"));
  const files = [...bytesByName.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files), manifest };
}

function resolvePaths(options = {}) {
  const outputRoot = resolve(options.outputRoot ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/business");
  const auditRoot = resolve(options.auditRoot ?? inside(outputRoot, ".master-package-audits"));
  const claimRoot = resolve(options.claimRoot ?? inside(outputRoot, ".master-package-claims"));
  const auditDirectory = inside(auditRoot, REQUEST_ID);
  return {
    outputRoot,
    templateDirectory,
    destinationDirectory: inside(outputRoot, SITE_ID),
    claimDirectory: inside(claimRoot, SITE_ID),
    auditDirectory,
    journalPath: inside(auditDirectory, "apply.json")
  };
}

async function isDirectory(path) {
  return stat(path).then((value) => value.isDirectory(), () => false);
}

async function readJournal(path, reasons, expectedPackageHash) {
  if (!(await exists(path))) return null;
  try {
    const journal = JSON.parse(await readFile(path, "utf8"));
    if (journal?.requestId !== REQUEST_ID || journal?.siteId !== SITE_ID || journal?.expectedPackageHash !== expectedPackageHash) {
      reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT");
    }
    return journal;
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_INVALID");
    return null;
  }
}

export async function planBusinessMasterPackage(options = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  let template = { bytesByName: new Map(), files: [], hash: "INVALID" };
  let expectedPackage = { bytesByName: new Map(), files: [], hash: "INVALID", manifest: null };
  try {
    template = await loadCanonicalTemplate(paths.templateDirectory);
    expectedPackage = buildExpectedPackage(template);
  } catch (error) {
    reasons.push(error instanceof Error && error.message.startsWith("BUSINESS_")
      ? error.message
      : "BUSINESS_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE");
  }
  const destination = await inventory(paths.destinationDirectory);
  const typographyPresent = await isDirectory(resolve(paths.destinationDirectory, "tipografia"));
  if (destination.exists && (destination.hash !== expectedPackage.hash || !typographyPresent)) {
    reasons.push("BUSINESS_MASTER_PACKAGE_DRIFT");
  }
  if (!options.ignoreClaim && await exists(paths.claimDirectory)) reasons.push("BUSINESS_MASTER_PACKAGE_CLAIM_PRESENT");
  const journal = await readJournal(paths.journalPath, reasons, expectedPackage.hash);
  if (journal && !destination.exists) reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_WITHOUT_PACKAGE");

  const material = {
    requestId: REQUEST_ID,
    operation: "CREATE_CANONICAL_BUSINESS_MASTER_PACKAGE",
    identity: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    canonicalTemplateHash: template.hash,
    canonicalTemplateFiles: template.files,
    expectedPackageHash: expectedPackage.hash,
    expectedPackageFiles: expectedPackage.files,
    destinationHash: destination.hash
  };
  const alreadyApplied = destination.exists && destination.hash === expectedPackage.hash && typographyPresent;
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    disposition: alreadyApplied ? "ALREADY_APPLIED" : "CREATE_LOCAL_MASTER_PACKAGE",
    destination: { present: destination.exists, hash: destination.hash, typographyDirectoryPresent: typographyPresent },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, partnerPackagesMutable: false }
  };
}

async function assertOwner(claimDirectory, owner) {
  const current = JSON.parse(await readFile(resolve(claimDirectory, "owner.json"), "utf8"));
  const left = Buffer.from(current.token ?? "");
  const right = Buffer.from(owner.token);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("BUSINESS_MASTER_PACKAGE_CLAIM_OWNERSHIP_LOST");
}

async function writeAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { flag: "wx", mode: 0o600 });
  await rename(temporary, path);
}

async function removeOwnedClaim(claimDirectory, owner) {
  if (!(await exists(claimDirectory))) return;
  await assertOwner(claimDirectory, owner);
  await rm(claimDirectory, { recursive: true });
}

export async function applyBusinessMasterPackage(options = {}) {
  if (options.mode !== APPLY_MODE) throw new Error("BUSINESS_MASTER_PACKAGE_APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error("BUSINESS_MASTER_PACKAGE_CONFIRMATION_REQUIRED");
  if (!/^[0-9a-f]{64}$/.test(options.expectedPlanHash ?? "")) throw new Error("BUSINESS_MASTER_PACKAGE_PLAN_HASH_REQUIRED");

  const paths = resolvePaths(options);
  const preview = await planBusinessMasterPackage(options);
  if (preview.planHash !== options.expectedPlanHash) throw new Error("BUSINESS_MASTER_PACKAGE_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`BUSINESS_MASTER_PACKAGE_BLOCKED:${preview.blockedReasons.join(",")}`);
  if (preview.disposition === "ALREADY_APPLIED") return { ...preview, mode: APPLY_MODE, outcome: "ALREADY_APPLIED" };

  const owner = { token: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString() };
  const stageDirectory = inside(paths.outputRoot, `.${SITE_ID}.${owner.token}.staging`);
  let stageCreated = false;
  let destinationInstalled = false;
  await mkdir(dirname(paths.claimDirectory), { recursive: true, mode: 0o700 });
  await mkdir(paths.claimDirectory, { mode: 0o700 });
  await writeFile(resolve(paths.claimDirectory, "owner.json"), json(owner), { flag: "wx", mode: 0o600 });

  try {
    const recheck = await planBusinessMasterPackage({ ...options, ignoreClaim: true });
    if (recheck.blocked || recheck.planHash !== preview.planHash || recheck.disposition !== "CREATE_LOCAL_MASTER_PACKAGE") {
      throw new Error("BUSINESS_MASTER_PACKAGE_DRIFT_BEFORE_INSTALL");
    }
    const template = await loadCanonicalTemplate(paths.templateDirectory);
    const expected = buildExpectedPackage(template);
    await assertOwner(paths.claimDirectory, owner);
    await mkdir(stageDirectory, { mode: 0o700 });
    stageCreated = true;
    for (const name of PACKAGE_FILES) {
      const bytes = expected.bytesByName.get(name);
      if (!bytes) throw new Error(`BUSINESS_MASTER_PACKAGE_EXPECTED_FILE_MISSING:${name}`);
      await writeFile(resolve(stageDirectory, name), bytes, { flag: "wx", mode: 0o600 });
    }
    await mkdir(resolve(stageDirectory, "tipografia"), { mode: 0o700 });
    const staged = await inventory(stageDirectory);
    if (staged.hash !== expected.hash || !(await isDirectory(resolve(stageDirectory, "tipografia")))) {
      throw new Error("BUSINESS_MASTER_PACKAGE_STAGING_HASH_DRIFT");
    }
    await assertOwner(paths.claimDirectory, owner);
    if (await exists(paths.destinationDirectory)) throw new Error("BUSINESS_MASTER_PACKAGE_DESTINATION_CREATED_CONCURRENTLY");
    await rename(stageDirectory, paths.destinationDirectory);
    stageCreated = false;
    destinationInstalled = true;
    const installed = await inventory(paths.destinationDirectory);
    if (installed.hash !== expected.hash || !(await isDirectory(resolve(paths.destinationDirectory, "tipografia")))) {
      throw new Error("BUSINESS_MASTER_PACKAGE_POST_INSTALL_HASH_DRIFT");
    }
    const journal = {
      requestId: REQUEST_ID,
      mode: APPLY_MODE,
      outcome: "APPLIED",
      siteId: SITE_ID,
      planHash: preview.planHash,
      canonicalTemplateHash: template.hash,
      expectedPackageHash: expected.hash,
      appliedAt: new Date().toISOString()
    };
    await writeAtomic(paths.journalPath, json(journal));
    await removeOwnedClaim(paths.claimDirectory, owner);
    return {
      ...preview,
      mode: APPLY_MODE,
      changed: true,
      blocked: false,
      blockedReasons: [],
      outcome: "APPLIED",
      destination: { present: true, hash: installed.hash, typographyDirectoryPresent: true },
      journalPath: paths.journalPath,
      safety: { ...preview.safety, localWritesMade: true, providerCallsMade: false, sftpAdapterCreated: false }
    };
  } catch (error) {
    if (stageCreated && await exists(stageDirectory)) {
      await assertOwner(paths.claimDirectory, owner);
      await rm(stageDirectory, { recursive: true });
    }
    if (!destinationInstalled) await removeOwnedClaim(paths.claimDirectory, owner);
    throw error;
  }
}

function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const [key, ...rest] = argument.split("=");
    if (!key.startsWith("--") || rest.length === 0) throw new Error(`UNKNOWN_ARGUMENT:${argument}`);
    values[key.slice(2)] = rest.join("=");
  }
  return values;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const mode = args.mode ?? "PREVIEW";
  const result = mode === "PREVIEW"
    ? await planBusinessMasterPackage()
    : await applyBusinessMasterPackage({
        mode,
        confirmation: args.confirm,
        expectedPlanHash: args["expected-plan-hash"]
      });
  process.stdout.write(json(result));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(json({ error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  });
}
