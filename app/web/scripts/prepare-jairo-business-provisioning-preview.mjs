import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planJairoBusinessProvisioning } from "./jairo-business-guarded-provisioning.mjs";

const EXPECTED = Object.freeze({
  activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
  ownerKey: "f403f29e-95c8-4825-9320-967376443020",
  siteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  rootEcosystemType: "PERSONAL_BRAND",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro",
  sourceHash: "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725",
  entitlementHash: "da41622c14c8f6377285b4625c498012532554bfb8b079dc6edf05ad58b20399"
});

const sha = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function validateEntitlement(value) {
  const business = value?.expectedTargets?.find((item) => item?.ecosystemType === "BUSINESS");
  if (value?.activationLeadId !== EXPECTED.activationLeadId || value?.commercialState !== "KNOWN" ||
      !value?.includedEcosystems?.includes("BUSINESS") || business?.role !== "SUBDOMAIN" ||
      business?.publicHost !== EXPECTED.publicHost || value?.rootRedirectApex?.preserved !== true ||
      value?.rootRedirectApex?.isPublishingTarget !== false) {
    throw new Error("APPROVED_ENTITLEMENT_CONTRACT_INVALID");
  }
}

export async function prepareJairoBusinessProvisioningPreview(options = {}) {
  const contract = options.contract ?? EXPECTED;
  const sourceDirectory = resolve(options.sourceDirectory ?? "/data/generated-sites/.sources");
  const sourcePath = resolve(sourceDirectory, `${contract.siteId}.json`);
  const approvedEntitlementPath = resolve(options.approvedEntitlementPath ?? "/data/generated-sites/.migration-inputs/CDX-20260821-013/entitlement.json");
  const inputParent = resolve(options.inputParent ?? "/data/generated-sites/.provisioning-inputs");
  const inputDirectory = resolve(inputParent, "CDX-20260824-007");
  const stagingDirectory = resolve(inputParent, ".CDX-20260824-007.staging");
  const stateDirectory = resolve(options.stateDirectory ?? "/data/generated-sites/.provisioning-audits/CDX-20260824-007");
  const targetPath = resolve(sourceDirectory, ".publishing-targets", `${contract.siteId}.json`);

  if (await exists(inputDirectory)) throw new Error("PROVISIONING_INPUT_ALREADY_EXISTS");
  if (await exists(stateDirectory)) throw new Error("PROVISIONING_STATE_ALREADY_EXISTS");
  if (await exists(targetPath)) throw new Error("PUBLISHING_TARGET_ALREADY_EXISTS");

  if (await exists(stagingDirectory)) {
    if ((await readdir(stagingDirectory)).length !== 0) throw new Error("PROVISIONING_STAGING_NOT_EMPTY");
  } else {
    await mkdir(stagingDirectory, { mode: 0o700 });
  }

  const [sourceBytes, entitlementBytes] = await Promise.all([readFile(sourcePath), readFile(approvedEntitlementPath)]);
  if (sha(sourceBytes) !== contract.sourceHash) throw new Error("SOURCE_HASH_DRIFT");
  if (sha(entitlementBytes) !== contract.entitlementHash) throw new Error("APPROVED_ENTITLEMENT_HASH_DRIFT");
  validateEntitlement(JSON.parse(entitlementBytes));

  const manifest = {
    confirmation: "PREVIEW_JAIRO_BUSINESS_PROVISIONING",
    allowlist: [{
      ownerKey: contract.ownerKey,
      siteId: contract.siteId,
      ecosystemType: contract.ecosystemType,
      rootEcosystemType: contract.rootEcosystemType,
      baseDomain: contract.baseDomain,
      publicHost: contract.publicHost,
      expectedSourceHash: contract.sourceHash,
      expectedEntitlementHash: contract.entitlementHash
    }]
  };
  const manifestBytes = json(manifest);
  await writeFile(resolve(stagingDirectory, "entitlement.json"), entitlementBytes, { flag: "wx", mode: 0o600 });
  await writeFile(resolve(stagingDirectory, "manifest.json"), manifestBytes, { flag: "wx", mode: 0o600 });
  await rename(stagingDirectory, inputDirectory);

  const preview = await planJairoBusinessProvisioning({
    sourceDirectory,
    manifestPath: resolve(inputDirectory, "manifest.json"),
    environment: options.environment ?? process.env
  });
  if (preview.mode !== "PREVIEW" || preview.changed !== false || preview.safety?.providerCallsMade !== false) {
    throw new Error("PROVISIONING_PREVIEW_CONTRACT_INVALID");
  }
  return {
    requestId: "CDX-20260825-001",
    mode: "PREPARE_AND_PREVIEW",
    changed: true,
    providerCallsMade: false,
    inputs: {
      directory: inputDirectory,
      entitlementSha256: contract.entitlementHash,
      manifestSha256: sha(manifestBytes)
    },
    preview
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepareJairoBusinessProvisioningPreview()
    .then((result) => process.stdout.write(json(result)))
    .catch((error) => { process.stderr.write(json({ error: error.message, providerCallsMade: false })); process.exitCode = 1; });
}
