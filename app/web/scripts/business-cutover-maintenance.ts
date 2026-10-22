import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BUSINESS_CUTOVER_PROTOCOL_VERSION } from "../server/services/businessCutoverClaimStore";
import { readBusinessCutoverStatus } from "../server/services/businessCutoverMaintenanceService";

// Import smoke exposes only protocol metadata and the real read-only reader.
// No administrative capability or mutation entrypoint ships through this CLI.
export { BUSINESS_CUTOVER_PROTOCOL_VERSION, readBusinessCutoverStatus };

const safety = { requestId: "CDX-20261021-010", protocolVersion: BUSINESS_CUTOVER_PROTOCOL_VERSION,
  mode: "STATUS", changed: false, localWritesMade: false, providerCallsMade: false };

async function main() {
  // An exact allowlist rejects duplicates and all authority/root overrides.
  if (process.argv.length !== 3 || process.argv[2] !== "--mode=STATUS") {
    console.error(JSON.stringify({ ...safety, status: "ERROR", reasons: ["BUSINESS_CUTOVER_ARGUMENT_INVALID"] }));
    process.exitCode = 1;
    return;
  }
  try {
    const result = await readBusinessCutoverStatus(resolve(process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites"));
    console.log(JSON.stringify({ ...safety, status: result.status, reasons: result.blockedReasons,
      migrationStarted: result.migrationStarted }));
    process.exitCode = result.status === "BLOCKED" ? 2 : 0;
  } catch {
    // Never serialize errors, arguments, operation metadata, credentials or paths.
    console.error(JSON.stringify({ ...safety, status: "ERROR", reasons: ["BUSINESS_CUTOVER_STATUS_FAILED"] }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
