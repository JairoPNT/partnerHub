import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { json } from "./business-master-transition-lifecycle.mjs";
import { planBusinessConsentMasterMigration, readBusinessConsentMasterMigration, applyBusinessConsentMasterMigration } from "./business-consent-master-release.mjs";
export { APPLY_MODE, APPLY_CONFIRMATION, planBusinessConsentMasterMigration, readBusinessConsentMasterMigration,
  applyBusinessConsentMasterMigration } from "./business-consent-master-release.mjs";

async function main() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(mode|confirm|expected-plan-hash|template-dir)=(.*)$/.exec(arg);
    if (!match || Object.hasOwn(args, match[1])) throw new Error("BUSINESS_CONSENT_MASTER_MIGRATION_ARGUMENT_INVALID");
    args[match[1]] = match[2];
  }
  const mode = args.mode ?? "PREVIEW";
  if (Object.hasOwn(args, "template-dir") && !["PREVIEW", "READBACK"].includes(mode)) throw new Error("BUSINESS_CONSENT_MASTER_MIGRATION_READ_ONLY_ARGUMENT");
  const readOptions = Object.hasOwn(args, "template-dir") ? { templateDirectory: args["template-dir"] } : {};
  const result = mode === "PREVIEW" ? await planBusinessConsentMasterMigration(readOptions)
    : mode === "READBACK" ? await readBusinessConsentMasterMigration(readOptions)
      : await applyBusinessConsentMasterMigration({ mode, confirmation: args.confirm, expectedPlanHash: args["expected-plan-hash"] });
  process.stdout.write(json(result));
  if (result.blocked) process.exitCode = 2;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error && /^BUSINESS_CONSENT_MASTER_MIGRATION_[A-Z0-9_:,-]+$/.test(error.message)
      ? error.message : "BUSINESS_CONSENT_MASTER_MIGRATION_FAILED_SAFELY";
    process.stderr.write(json({ error: message, providerCallsMade: false }));
    process.exitCode = 1;
  });
}
