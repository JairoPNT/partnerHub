import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const EXPECTED_PLAN_HASH = "7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf";
const TARGET = "/data/generated-sites/.sources/.publishing-targets/jairo-pinto-business.json";
const STATE = "/data/generated-sites/.provisioning-audits/CDX-20260824-007";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function jsonFile(path) { const bytes = await readFile(path); return { bytes, value: JSON.parse(bytes) }; }

export async function diagnose({ targetPath = TARGET, stateDirectory = STATE } = {}) {
  const claimOwnerPath = resolve(stateDirectory, "claim", "owner.json");
  const journalPath = resolve(stateDirectory, "apply.json");
  const [targetPresent, claimPresent, journalPresent] = await Promise.all([exists(targetPath), exists(claimOwnerPath), exists(journalPath)]);
  const target = targetPresent ? await jsonFile(targetPath) : null;
  const owner = claimPresent ? await jsonFile(claimOwnerPath) : null;
  const journal = journalPresent ? await jsonFile(journalPath) : null;
  const identityValid = target ? target.value?.version === 2 && target.value?.ownerKey === "f403f29e-95c8-4825-9320-967376443020" && target.value?.siteId === "jairo-pinto-business" && target.value?.ecosystemType === "BUSINESS" && target.value?.baseDomain === "jairopinto.pro" && target.value?.publicHost === "negocio.jairopinto.pro" : false;
  const claimPlanValid = owner?.value?.planHash === EXPECTED_PLAN_HASH;
  const recoveryEligible = Boolean(target && owner && !journal && identityValid && claimPlanValid);
  return {
    requestId: "CDX-20260825-003", mode: "READ_ONLY_DIAGNOSTIC", changed: false,
    target: target ? { present: true, sha256: sha(target.bytes), identityValid, provisioningState: target.value.provisioningState ?? null, publicationState: target.value.publicationState ?? null, hostingerState: target.value.hostingerState ?? null, dnsState: target.value.dnsState ?? null, sslState: target.value.sslState ?? null, remoteRootPresent: typeof target.value.remoteRoot === "string" && target.value.remoteRoot.startsWith("/") } : { present: false },
    claim: owner ? { present: true, ownerTokenRedacted: true, planHash: owner.value.planHash ?? null, planHashValid: claimPlanValid, acquiredAt: owner.value.acquiredAt ?? null } : { present: false },
    journal: journal ? { present: true, sha256: sha(journal.bytes), outcome: journal.value.outcome ?? null, planHash: journal.value.planHash ?? null } : { present: false },
    recoveryEligible, nextAction: recoveryEligible ? "AUDIT_GUARDED_RESUME" : "STOP_AND_REVIEW_STATE"
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) diagnose().then((value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)).catch((error) => { process.stderr.write(`${JSON.stringify({ error: error.message })}\n`); process.exitCode = 1; });
