import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { FreshEntitlementError, JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT, readFreshJairoBusinessEntitlement } from "./lib/jairo-business-fresh-entitlement.mjs";

export const SERVICE_TOKEN_MODE = "SERVICE_TOKEN";
export const OPERATOR_EXPORT_MODE = "OPERATOR_EXPORT";
const EXPECTED_ID = "f403f29e-95c8-4825-9320-967376443020";
const EXPECTED_HOST = "negocio.jairopinto.pro";
export const JAIRO_ENTITLEMENT_ENDPOINT = JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value) => createHash("sha256").update(value).digest("hex");
async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])); return value; }
function validateEntitlement(value) {
  const business = value?.expectedTargets?.find((item) => item.ecosystemType === "BUSINESS");
  if (value?.activationLeadId !== EXPECTED_ID || value?.commercialState !== "KNOWN" || !value?.includedEcosystems?.includes("BUSINESS") ||
      business?.role !== "SUBDOMAIN" || business?.publicHost !== EXPECTED_HOST || value?.rootRedirectApex?.preserved !== true || value?.rootRedirectApex?.isPublishingTarget !== false) {
    throw new Error("BUSINESS_ENTITLEMENT_IDENTITY_INVALID");
  }
  return value;
}
async function prepareDirectory(outputDirectory, resumeEmptyStaging) {
  const output = resolve(outputDirectory); const destination = resolve(output, "entitlement.json");
  if (await exists(destination)) throw new Error("ENTITLEMENT_OUTPUT_COLLISION");
  if (await exists(output)) {
    if (!resumeEmptyStaging) throw new Error("STAGING_ALREADY_EXISTS");
    if ((await readdir(output)).length !== 0) throw new Error("STAGING_NOT_EMPTY");
  } else { await mkdir(output, { recursive: false, mode: 0o700 }); }
  return { output, destination };
}
export async function prepareJairoBusinessEntitlementSnapshot(options) {
  if (![SERVICE_TOKEN_MODE, OPERATOR_EXPORT_MODE].includes(options.mode)) throw new Error("SNAPSHOT_MODE_INVALID");
  const paths = await prepareDirectory(options.outputDirectory, options.resumeEmptyStaging === true);
  let canonicalBytes; let entitlementSha256; let identity;
  if (options.mode === SERVICE_TOKEN_MODE) {
    const environment = options.environment ?? process.env;
    if (!environment.CF_ACCESS_CLIENT_ID?.trim() || !environment.CF_ACCESS_CLIENT_SECRET?.trim()) throw new FreshEntitlementError("SERVICE_TOKEN_CONFIGURATION_MISSING");
    if (options.endpoint !== undefined && options.endpoint !== JAIRO_ENTITLEMENT_ENDPOINT) throw new Error("ENTITLEMENT_ENDPOINT_NOT_ALLOWLISTED");
    ({ canonicalBytes, sha256: entitlementSha256, identity } = await readFreshJairoBusinessEntitlement({ environment, fetchImplementation: options.fetchImplementation ?? globalThis.fetch }));
  } else {
    if (!options.operatorExportPath) throw new Error("OPERATOR_EXPORT_PATH_REQUIRED");
    const parsed = validateEntitlement(JSON.parse(await readFile(resolve(options.operatorExportPath), "utf8")));
    canonicalBytes = Buffer.from(json(canonical(parsed)));
    entitlementSha256 = sha(canonicalBytes);
    identity = { activationLeadId: EXPECTED_ID, businessPublicHost: EXPECTED_HOST, businessEntitled: true };
  }
  const temporary = resolve(paths.output, `.entitlement.${randomUUID()}.tmp`);
  await writeFile(temporary, canonicalBytes, { flag: "wx", mode: 0o600 }); await rename(temporary, paths.destination);
  return { requestId: "CDX-20260824-009", mode: options.mode, outcome: "SNAPSHOT_READY", changed: true, entitlementPath: paths.destination, entitlementSha256,
    identity, authentication: options.mode === SERVICE_TOKEN_MODE ? "CLOUDFLARE_ACCESS_SERVICE_TOKEN" : "OPERATOR_AUTHENTICATED_BROWSER_EXPORT",
    security: { cookiesUsed: false, bindingCookieCopied: false, serviceTokenPersisted: false, secretsPrinted: false, canonicalized: true } };
}
async function main() { const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3); const mode = arg("mode"); const outputDirectory = arg("output-dir");
  if (!outputDirectory) throw new Error("OUTPUT_DIRECTORY_REQUIRED"); if (arg("endpoint")) throw new Error("ENDPOINT_ARGUMENT_FORBIDDEN_USE_COMPILED_ALLOWLIST");
  const result = await prepareJairoBusinessEntitlementSnapshot({ mode, outputDirectory, operatorExportPath: arg("operator-export"), environment: process.env,
    resumeEmptyStaging: process.argv.includes("--resume-empty-staging") }); process.stdout.write(json(result)); }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(json({ error: error.message })); process.exitCode = 1; });
