import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readFreshJairoBusinessEntitlement } from "./lib/jairo-business-fresh-entitlement.mjs";
import { runJairoBusinessPublishingPreflight } from "./jairo-business-publishing-preflight.mjs";

const SITE_ID = "jairo-pinto-business";
const fixedScratchRoot = ".app-owned-jairo-business-preflight";
const SAFE_CODE = /^[A-Z][A-Z0-9_]*$/;
const SAFE_REASON = /^[A-Z][A-Z0-9_]*(?::[A-Z][A-Z0-9_]*)?$/;
const FILENAME_REASON_PREFIXES = ["BUSINESS_MASTER_PACKAGE_MISSING", "INVALID_PUBLISHING_TARGET"];
const SHA256 = /^[0-9a-f]{64}$/;
const FORBIDDEN_FLAGS = new Set(["--apply", "--mode", "--manifest", "--endpoint", "--output-dir", "--source-dir"]);
const json = (value) => `${JSON.stringify(value)}\n`;

function result(status, blockedReasons = []) {
  return { requestId: "CDX-20260922-002", mode: "PREVIEW", changed: false, status, blockedReasons,
    providerCallsMade: false, secretsExposed: false };
}

function argumentError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function parseArguments(argv) {
  let siteId;
  for (const argument of argv) {
    const flag = typeof argument === "string" ? argument.split("=", 1)[0] : "";
    if (FORBIDDEN_FLAGS.has(flag)) throw argumentError("FORBIDDEN_ARGUMENT");
    if (flag !== "--site-id" || !argument.startsWith("--site-id=")) throw argumentError("UNKNOWN_ARGUMENT");
    if (siteId !== undefined) throw argumentError("DUPLICATE_ARGUMENT");
    siteId = argument.slice("--site-id=".length);
    if (!siteId) throw argumentError("SITE_ID_REQUIRED");
  }
  if (siteId === undefined) throw argumentError("SITE_ID_REQUIRED");
  return { siteId };
}

function safeReasons(reasons) {
  if (!Array.isArray(reasons)) return ["PREFLIGHT_BLOCKED"];
  const safe = reasons.flatMap((reason) => {
    if (typeof reason !== "string") return [];
    const filenameCategory = FILENAME_REASON_PREFIXES.find((prefix) => reason.startsWith(`${prefix}:`));
    if (filenameCategory) return [filenameCategory];
    return SAFE_REASON.test(reason) ? [reason] : [];
  });
  return safe.length ? [...new Set(safe)] : ["PREFLIGHT_BLOCKED"];
}

export async function runAppOwnedJairoBusinessPreflight({ siteId, reader = readFreshJairoBusinessEntitlement,
  preflight = runJairoBusinessPublishingPreflight, scratchRoot = fixedScratchRoot, environment = process.env }) {
  if (siteId !== SITE_ID) return result("BLOCKED", ["SITE_NOT_ALLOWLISTED"]);

  let fresh;
  try {
    fresh = await reader({ environment });
    if (!Buffer.isBuffer(fresh?.canonicalBytes) || !SHA256.test(fresh?.sha256 ?? "") ||
        createHash("sha256").update(fresh.canonicalBytes).digest("hex") !== fresh.sha256) {
      throw argumentError("ENTITLEMENT_REFRESH_FAILED");
    }
  } catch (error) {
    return result("ENTITLEMENT_REFRESH_FAILED", [SAFE_CODE.test(error?.code ?? "") ? error.code : "ENTITLEMENT_REFRESH_FAILED"]);
  }

  const sourceDirectory = resolve(environment.PRODUCT_PAGE_SOURCE_DIR || "/data/generated-sites/.sources");
  const outputDirectory = resolve(environment.PRODUCT_PAGE_OUTPUT_DIR || "/data/generated-sites");
  const ownedScratchRoot = resolve(outputDirectory, scratchRoot);
  let bundle;
  let outcome;
  try {
    await mkdir(ownedScratchRoot, { recursive: true, mode: 0o700 });
    bundle = await mkdtemp(resolve(ownedScratchRoot, "input-"));
    const manifestPath = resolve(bundle, "manifest.json");
    const manifest = { confirmation: "PREVIEW_JAIRO_BUSINESS_PUBLISHING", allowlist: [{
      activationLeadId: "f403f29e-95c8-4825-9320-967376443020", ownerSiteId: "jairo-pinto", siteId: SITE_ID,
      ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro",
      publicHost: "negocio.jairopinto.pro", expectedSourceHash: "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725",
      expectedEntitlementHash: fresh.sha256,
    }] };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await writeFile(resolve(bundle, "entitlement.json"), fresh.canonicalBytes, { flag: "wx", mode: 0o600 });
    const native = await preflight({ sourceDirectory, outputDirectory, manifestPath, environment });
    outcome = native?.blocked === false ? result("READY") : result("BLOCKED", safeReasons(native?.blockedReasons));
  } catch {
    outcome = result("BLOCKED", ["PREFLIGHT_FAILED"]);
  } finally {
    if (bundle) {
      try { await rm(bundle, { recursive: true, force: false }); }
      catch { outcome = result("BLOCKED", ["EPHEMERAL_INPUT_CLEANUP_FAILED"]); }
    }
  }
  return outcome;
}

async function main() {
  const { siteId } = parseArguments(process.argv.slice(2));
  const output = await runAppOwnedJairoBusinessPreflight({ siteId });
  process.stdout.write(json(output));
  if (output.status !== "READY") process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stdout.write(json({ error: SAFE_CODE.test(error?.code ?? "") ? error.code : "PREFLIGHT_FAILED" }));
    process.exitCode = 1;
  });
}
