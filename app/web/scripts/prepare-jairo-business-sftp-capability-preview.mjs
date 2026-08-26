import { createHash, randomBytes, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planSftpCapabilityProbe } from "./sftp-directory-rename-capability-probe.mjs";

const EXPECTED = Object.freeze({
  ownerKey: "f403f29e-95c8-4825-9320-967376443020",
  siteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro"
});
const INPUT_ID = "CDX-20260824-006";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);

function normalizeRemote(path) {
  const normalized = posix.normalize(path ?? "").replace(/\/+$/, "");
  if (!normalized.startsWith("/") || normalized === "/") throw new Error("TARGET_REMOTE_ROOT_INVALID");
  return normalized;
}

function validateTarget(bytes) {
  const target = JSON.parse(bytes);
  for (const [key, value] of Object.entries(EXPECTED)) {
    if (target?.[key] !== value) throw new Error(`TARGET_${key.toUpperCase()}_MISMATCH`);
  }
  if (target.version !== 2 || target.provisioningState !== "READY" || target.publicationState !== "PENDING") {
    throw new Error("TARGET_STATE_INVALID");
  }
  const remoteRoot = normalizeRemote(target.remoteRoot);
  const parentDirectory = normalizeRemote(posix.dirname(remoteRoot));
  if (parentDirectory === "/") throw new Error("TARGET_PARENT_ROOT_FORBIDDEN");
  return { target, remoteRoot, parentDirectory };
}

function createManifest(targetBytes, target) {
  const probeToken = randomUUID();
  const canaryHex = randomBytes(32).toString("hex");
  const path = (kind) => posix.join(target.parentDirectory, `.partnerhub-capability-${kind}-${probeToken}`);
  return {
    confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY",
    allowlist: [{
      ...EXPECTED,
      expectedTargetHash: sha256(targetBytes),
      remoteRoot: target.remoteRoot,
      parentDirectory: target.parentDirectory,
      probeToken,
      paths: { claim: path("claim"), stage: path("stage"), destination: path("destination"), backup: path("backup") },
      canaryHex,
      ttlSeconds: 1800
    }]
  };
}

async function assertReusableInput(directory) {
  const entries = (await readdir(directory, { withFileTypes: true })).map((entry) => `${entry.isFile() ? "f" : "o"}:${entry.name}`).sort();
  if (JSON.stringify(entries) !== JSON.stringify(["f:manifest.json"])) throw new Error("CAPABILITY_INPUT_DIRECTORY_NOT_REUSABLE");
}

export async function prepareJairoBusinessSftpCapabilityPreview(options = {}) {
  const sourceDirectory = resolve(options.sourceDirectory ?? "/data/generated-sites/.sources");
  const targetPath = resolve(sourceDirectory, ".publishing-targets", `${EXPECTED.siteId}.json`);
  const inputParent = resolve(options.inputParent ?? "/data/generated-sites/.publication-inputs");
  const inputDirectory = resolve(inputParent, INPUT_ID);
  const stagingDirectory = resolve(inputParent, `.${INPUT_ID}.staging`);
  const manifestPath = resolve(inputDirectory, "manifest.json");
  const targetBytes = await readFile(targetPath);
  const target = validateTarget(targetBytes);

  let created = false;
  if (await exists(stagingDirectory)) throw new Error("CAPABILITY_STAGING_RESIDUE");
  if (await exists(inputDirectory)) {
    await assertReusableInput(inputDirectory);
  } else {
    const manifestBytes = json(createManifest(targetBytes, target));
    await mkdir(stagingDirectory, { mode: 0o700 });
    await writeFile(resolve(stagingDirectory, "manifest.json"), manifestBytes, { flag: "wx", mode: 0o600 });
    await rename(stagingDirectory, inputDirectory);
    created = true;
  }

  const preview = await planSftpCapabilityProbe({
    manifestPath,
    sourceDirectory,
    environment: options.environment ?? process.env
  });
  if (preview.mode !== "PREVIEW" || preview.changed !== false || preview.safety?.adapterCreated !== false || preview.safety?.providerCallsMade !== false) {
    throw new Error("CAPABILITY_PREVIEW_CONTRACT_INVALID");
  }
  const manifestBytes = await readFile(manifestPath);
  return {
    requestId: "CDX-20260826-002",
    mode: "PREPARE_AND_PREVIEW_SFTP_CAPABILITY",
    changed: created,
    providerCallsMade: false,
    inputs: { directory: inputDirectory, manifestSha256: sha256(manifestBytes), reused: !created },
    preview: {
      requestId: preview.requestId,
      mode: preview.mode,
      changed: preview.changed,
      blocked: preview.blocked,
      blockedReasons: preview.blockedReasons,
      planHash: preview.planHash,
      planMaterial: preview.planMaterial,
      safety: preview.safety
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepareJairoBusinessSftpCapabilityPreview()
    .then((result) => { process.stdout.write(json(result)); if (result.preview.blocked) process.exitCode = 2; })
    .catch((error) => { process.stderr.write(json({ error: error.message, providerCallsMade: false })); process.exitCode = 1; });
}
