import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { activationOfferSnapshotSchema } from "@/server/services/activationOfferCatalog";
import { activationLeadService } from "@/server/services/activationLeadService";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";
import {
  applyWompiEvent,
  copToAmountInCents,
  createCheckoutIntegritySignature,
  resolveWompiSandboxConfig,
  verifyEventChecksum,
  wompiEventSchema,
  wompiIntentInputSchema,
  type WompiEvent,
  type WompiIntentInput,
  type WompiPaymentIntent
} from "@/server/services/wompiSandboxCore";
import {
  lookupWompiIntentStatus,
  wompiIntentStatusQuerySchema,
  type WompiIntentStatusQuery
} from "@/server/services/wompiIntentStatusCore";

function getConfig() {
  return resolveWompiSandboxConfig(process.env);
}

function storageDirectory() {
  return process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments";
}

function storagePath() {
  return resolve(storageDirectory(), "wompi-sandbox-intents.json");
}

async function readIntents() {
  try {
    return JSON.parse(await readFile(storagePath(), "utf8")) as WompiPaymentIntent[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeIntents(intents: WompiPaymentIntent[]) {
  const target = storagePath();
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(storageDirectory(), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(intents, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

function publicIntent(intent: WompiPaymentIntent, publicKey: string, integritySecret: string) {
  return {
    intentId: intent.id,
    reference: intent.reference,
    amountInCents: intent.amountInCents,
    currency: intent.currency,
    publicKey,
    signature: {
      integrity: createCheckoutIntegritySignature(
        intent.reference,
        intent.amountInCents,
        intent.currency,
        integritySecret
      )
    }
  };
}

async function createIntent(input: WompiIntentInput) {
  const parsed = wompiIntentInputSchema.parse(input);
  const config = getConfig();
  const lead = await activationLeadService.getById(parsed.activationLeadId);
  if (!lead) throw new Error("Activation lead was not found.");
  const snapshot = activationOfferSnapshotSchema.parse(lead.offerSnapshot);
  if (lead.offerCode !== parsed.offerCode || snapshot.offerCode !== parsed.offerCode) {
    throw new Error("Offer does not match the activation lead snapshot.");
  }
  const intents = await readIntents();
  const existing = intents.find((intent) =>
    intent.activationLeadId === parsed.activationLeadId &&
    intent.offerCode === parsed.offerCode &&
    intent.status === "PENDING"
  );
  if (existing) return { ...publicIntent(existing, config.publicKey, config.integritySecret), idempotent: true };

  const now = new Date().toISOString();
  const id = randomUUID();
  const intent: WompiPaymentIntent = {
    id,
    activationLeadId: parsed.activationLeadId,
    offerCode: parsed.offerCode,
    reference: `PH-${id}`,
    amountCop: snapshot.amountCop,
    amountInCents: copToAmountInCents(snapshot.amountCop),
    currency: "COP",
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    processedEventChecksums: []
  };
  await writeIntents([...intents, intent]);
  return { ...publicIntent(intent, config.publicKey, config.integritySecret), idempotent: false };
}

async function processEvent(rawEvent: unknown, headerChecksum?: string | null) {
  const config = getConfig();
  const event = wompiEventSchema.parse(rawEvent);
  if (!verifyEventChecksum(event, config.eventsSecret, headerChecksum)) {
    throw new Error("Invalid Wompi event checksum.");
  }
  const intents = await readIntents();
  const index = intents.findIndex((intent) => intent.reference === event.data.transaction.reference);
  if (index < 0) throw new Error("Wompi payment intent was not found.");
  const current = intents[index];
  const result = applyWompiEvent(current, event, new Date().toISOString());
  if (result.duplicate) {
    return {
      accepted: true,
      duplicate: true,
      status: current.status,
      observation: {
        activationLeadId: current.activationLeadId,
        reference: current.reference,
        transactionId: event.data.transaction.id
      }
    };
  }

  let ledgerIdempotent = false;
  if (result.intent.status === "APPROVED") {
    const transaction = (event as WompiEvent).data.transaction;
    let ledger;
    try {
      ledger = await manualPaymentLedgerService.create({
        activationLeadId: current.activationLeadId,
        category: "ACTIVATION",
        amountCop: current.amountCop,
        method: "WOMPI",
        paidAt: transaction.finalized_at ?? event.sent_at,
        reference: current.reference,
        notes: `Wompi Sandbox transaction ${transaction.id}`,
        idempotencyKey: `wompi:${transaction.id}`
      });
    } catch {
      throw new Error("Wompi ledger persistence failed.");
    }
    ledgerIdempotent = ledger.idempotent;
  }
  intents[index] = result.intent;
  try {
    await writeIntents(intents);
  } catch {
    throw new Error("Wompi intent persistence failed.");
  }
  return {
    accepted: true,
    duplicate: false,
    ledgerIdempotent,
    status: result.intent.status,
    observation: {
      activationLeadId: current.activationLeadId,
      reference: current.reference,
      transactionId: result.intent.transactionId!
    }
  };
}

async function getIntentStatus(query: WompiIntentStatusQuery) {
  const parsed = wompiIntentStatusQuerySchema.parse(query);
  const [intents, ledger] = await Promise.all([
    readIntents(),
    manualPaymentLedgerService.list({ activationLeadId: parsed.activationLeadId, status: "CONFIRMED" })
  ]);
  return lookupWompiIntentStatus(intents, ledger.payments, parsed);
}

async function findIntentObservation(reference: string) {
  const intent = (await readIntents()).find((candidate) => candidate.reference === reference);
  return intent ? { activationLeadId: intent.activationLeadId } : {};
}

export const wompiSandboxService = { createIntent, findIntentObservation, getIntentStatus, processEvent };

export const wompiSandboxPersistence = { readIntents, writeIntents };
