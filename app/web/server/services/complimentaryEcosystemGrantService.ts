import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { activationLeadService } from "@/server/services/activationLeadService";
import {
  activeComplimentaryGrantEcosystems,
  createComplimentaryGrant,
  type ComplimentaryEcosystemGrant
} from "@/server/services/complimentaryEcosystemGrantCore";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";
import { listComplimentaryGrantsByLead } from "@/server/services/complimentaryGrantReadbackCore";
import { buildPartnerEcosystemEntitlement, type EcosystemType } from "@/server/services/partnerEcosystemEntitlementCore";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";

function storageDirectory() {
  return process.env.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR ?? "/data/generated-sites/.commercial-grants";
}

function storagePath() {
  return resolve(storageDirectory(), "complimentary-ecosystem-grants.json");
}

async function readRecords() {
  try {
    return JSON.parse(await readFile(storagePath(), "utf8")) as ComplimentaryEcosystemGrant[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: ComplimentaryEcosystemGrant[]) {
  const target = storagePath();
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(storageDirectory(), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

function bogotaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

let mutationQueue: Promise<void> = Promise.resolve();

async function createUnlocked(
  activationLeadId: string,
  input: unknown,
  operator: { subject: string; email?: string }
) {
  const lead = await activationLeadService.getById(activationLeadId);
  if (!lead) return null;
  const [records, paymentResult, targets] = await Promise.all([
    readRecords(),
    manualPaymentLedgerService.list({ activationLeadId, status: "CONFIRMED" }),
    partnerEcosystemTargetReader.list()
  ]);
  const activeGrants = activeComplimentaryGrantEcosystems(records, activationLeadId, bogotaDate());
  const entitlement = buildPartnerEcosystemEntitlement({
    ...lead,
    additionalCommercialSnapshots: paymentResult.payments
      .flatMap((payment) => payment.commercialSnapshot ? [payment.commercialSnapshot] : []),
    complimentaryGrantEcosystems: activeGrants
  }, targets);
  const result = createComplimentaryGrant(records, activationLeadId, input, {
    operatorSubject: operator.subject,
    operatorEmail: operator.email,
    existingEntitlements: entitlement.includedEcosystems as EcosystemType[],
    now: new Date().toISOString()
  });
  if (!result.idempotent) await writeRecords(result.records);
  return { grant: result.grant, idempotent: result.idempotent };
}

async function create(activationLeadId: string, input: unknown, operator: { subject: string; email?: string }) {
  const operation = mutationQueue.then(() => createUnlocked(activationLeadId, input, operator));
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function listActiveEcosystems(activationLeadId: string, effectiveDate = bogotaDate()) {
  return activeComplimentaryGrantEcosystems(await readRecords(), activationLeadId, effectiveDate);
}

async function listByLead(activationLeadId: string) {
  return listComplimentaryGrantsByLead(await readRecords(), activationLeadId);
}

export const complimentaryEcosystemGrantService = { create, listActiveEcosystems, listByLead };
