import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { activationLeadService } from "@/server/services/activationLeadService";
import {
  createPaymentRecord,
  findIdempotentPayment,
  listPaymentRecords,
  manualPaymentCreateSchema,
  paymentListFilterSchema,
  paymentEcosystemAssignmentState,
  paymentVoidSchema,
  voidPaymentRecord,
  type ManualPaymentCreateInput,
  type ManualPaymentRecord,
  type PaymentListFilter
} from "@/server/services/manualPaymentLedgerCore";

function getStorageDirectory() {
  return process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments";
}

function getStoragePath() {
  return resolve(getStorageDirectory(), "payments.json");
}

async function readPayments() {
  try {
    return JSON.parse(await readFile(getStoragePath(), "utf8")) as ManualPaymentRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writePayments(payments: ManualPaymentRecord[]) {
  const directory = resolve(getStorageDirectory());
  const target = getStoragePath();
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(payments, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

let createQueue: Promise<void> = Promise.resolve();

async function createUnlocked(input: ManualPaymentCreateInput) {
  const parsed = manualPaymentCreateSchema.parse(input);
  const lead = await activationLeadService.getById(parsed.activationLeadId);
  if (!lead) throw new Error(`Activation lead ${parsed.activationLeadId} was not found.`);

  if (parsed.siteId && parsed.siteId !== lead.siteId) {
    throw new Error("siteId must match the activation lead siteId.");
  }

  const payments = await readPayments();
  const existing = findIdempotentPayment(payments, parsed);
  if (existing) return {
    payment: existing,
    paymentId: existing.id,
    ...paymentEcosystemAssignmentState(existing),
    idempotent: true
  };

  const now = new Date().toISOString();
  const payment = createPaymentRecord(parsed, {
    id: randomUUID(),
    now,
    siteId: lead.siteId ?? null,
    existingRecords: payments.filter((record) => record.activationLeadId === parsed.activationLeadId)
  });
  await writePayments([...payments, payment]);
  return {
    payment,
    paymentId: payment.id,
    ...paymentEcosystemAssignmentState(payment),
    idempotent: false
  };
}

async function create(input: ManualPaymentCreateInput) {
  const operation = createQueue.then(() => createUnlocked(input));
  createQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function list(filters: PaymentListFilter = {}) {
  return listPaymentRecords(await readPayments(), paymentListFilterSchema.parse(filters));
}

async function getById(id: string) {
  const payment = (await readPayments()).find((record) => record.id === id);
  return payment ?? null;
}

async function voidById(id: string, reason: string) {
  const parsedReason = paymentVoidSchema.parse({ reason }).reason;
  const payments = await readPayments();
  const result = voidPaymentRecord(payments, id, parsedReason, new Date().toISOString());
  if (!result.payment) return null;
  if (!result.alreadyVoided) await writePayments(result.records);
  return { payment: result.payment, idempotent: result.alreadyVoided };
}

export const manualPaymentLedgerService = { create, list, getById, voidById };
