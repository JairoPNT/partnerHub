/* global fetch, process */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ALLOWED_REFERENCES = Object.freeze([
  "PH-640eb48c-a676-48ca-baec-455b2170397e",
  "PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f"
]);

export const BLOCKED_REFERENCE = "PH-a456d9c3-f7e5-488c-b52f-003dd3625300";

export function parseCommandArgs(args) {
  let reference;
  let applyConfirmed = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--reference") {
      reference = args[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--apply") {
      applyConfirmed = true;
      continue;
    }
    throw new Error(`Unsupported reconciliation option: ${argument}`);
  }
  if (!reference?.trim()) throw new Error("An explicit --reference is required.");
  return {
    reference: reference.trim(),
    mode: applyConfirmed ? "APPLY" : "DRY_RUN",
    applyConfirmed
  };
}

function assertAuthorizedReference(reference) {
  if (reference === BLOCKED_REFERENCE) {
    throw new Error("This Wompi reference is explicitly blocked from reconciliation.");
  }
  if (!ALLOWED_REFERENCES.includes(reference)) {
    throw new Error("This Wompi reference is not authorized for reconciliation.");
  }
}

function hasPayment(payments, intent) {
  return payments.some((payment) =>
    payment.activationLeadId === intent.activationLeadId &&
    payment.method === "WOMPI" &&
    payment.reference === intent.reference &&
    payment.status === "CONFIRMED"
  );
}

export function approveIntent(intent, transactionId, now) {
  if (typeof transactionId !== "string" || !transactionId.trim()) {
    throw new Error("A valid Wompi transactionId is required.");
  }
  return {
    ...intent,
    status: "APPROVED",
    transactionId,
    paymentRecorded: true,
    updatedAt: now
  };
}

export async function runCommand(input, dependencies) {
  const mode = input.mode ?? "DRY_RUN";
  if (mode === "APPLY" && input.applyConfirmed !== true) {
    throw new Error("APPLY requires the explicit --apply option.");
  }
  assertAuthorizedReference(input.reference);

  const intent = await dependencies.loadIntent(input.reference);
  if (!intent) throw new Error("Wompi payment intent was not found.");
  const transactions = await dependencies.queryTransactions(input.reference);
  const matching = transactions.filter((transaction) => transaction.reference === input.reference);
  if (matching.length > 1) throw new Error("Multiple Wompi transactions matched the reference.");
  const transaction = matching[0];

  if (!transaction) {
    return {
      mode,
      reference: input.reference,
      transactionId: null,
      remoteStatus: null,
      amountInCents: null,
      currency: null,
      activationLeadId: intent.activationLeadId,
      validation: "TRANSACTION_NOT_FOUND",
      action: "NONE"
    };
  }

  const valid =
    transaction.status === "APPROVED" &&
    transaction.reference === intent.reference &&
    transaction.amount_in_cents === intent.amountInCents &&
    transaction.currency === "COP" &&
    transaction.currency === intent.currency &&
    typeof transaction.id === "string" &&
    transaction.id.trim().length > 0;
  if (!valid) {
    return {
      mode,
      reference: input.reference,
      transactionId: transaction.id ?? null,
      remoteStatus: transaction.status ?? null,
      amountInCents: transaction.amount_in_cents ?? null,
      currency: transaction.currency ?? null,
      activationLeadId: intent.activationLeadId,
      validation: "REJECTED",
      action: "NONE"
    };
  }

  const paymentExists = hasPayment(await dependencies.loadPayments(intent.activationLeadId), intent);
  const action = paymentExists
    ? "REUSE_PAYMENT_AND_APPROVE_INTENT"
    : "CREATE_PAYMENT_AND_APPROVE_INTENT";
  if (mode === "APPLY") await dependencies.apply({ intent, transaction, paymentExists });

  return {
    mode,
    reference: input.reference,
    transactionId: transaction.id,
    remoteStatus: transaction.status,
    amountInCents: transaction.amount_in_cents,
    currency: transaction.currency,
    activationLeadId: intent.activationLeadId,
    validation: "VALID",
    action
  };
}

function resolveSandboxConfig(source) {
  if (source.WOMPI_ENV !== "sandbox") throw new Error("Wompi Sandbox is not configured.");
  const privateKey = source.WOMPI_SANDBOX_PRIVATE_KEY;
  if (!privateKey) throw new Error("Wompi Sandbox credentials are incomplete.");
  if (!privateKey.startsWith("prv_test_")) {
    throw new Error("Wompi Sandbox credentials are invalid for the configured environment.");
  }
  return { privateKey };
}

function parseTransactionList(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw new Error("Wompi Sandbox returned an invalid transaction list.");
  }
  return payload.data.map((transaction) => {
    if (!transaction || typeof transaction !== "object") {
      throw new Error("Wompi Sandbox returned an invalid transaction.");
    }
    const valid =
      typeof transaction.id === "string" && transaction.id.trim().length > 0 &&
      typeof transaction.reference === "string" && transaction.reference.trim().length > 0 &&
      typeof transaction.status === "string" && transaction.status.trim().length > 0 &&
      Number.isSafeInteger(transaction.amount_in_cents) && transaction.amount_in_cents > 0 &&
      typeof transaction.currency === "string" && transaction.currency.trim().length > 0 &&
      (transaction.finalized_at == null || (
        typeof transaction.finalized_at === "string" &&
        !Number.isNaN(Date.parse(transaction.finalized_at))
      ));
    if (!valid) throw new Error("Wompi Sandbox returned an invalid transaction.");
    return transaction;
  });
}

async function readJsonArray(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (!Array.isArray(value)) throw new Error("Expected a JSON array.");
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonArray(path, values) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(values, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function createPayment(intent, transaction, lead, now) {
  return {
    activationLeadId: intent.activationLeadId,
    category: "ACTIVATION",
    amountCop: intent.amountCop,
    method: "WOMPI",
    paidAt: transaction.finalized_at ?? now,
    reference: intent.reference,
    notes: `Wompi Sandbox reconciliation ${transaction.id}`,
    idempotencyKey: `wompi:${transaction.id}`,
    siteId: lead.siteId ?? null,
    id: randomUUID(),
    status: "CONFIRMED",
    createdAt: now,
    updatedAt: now
  };
}

export async function main(args = process.argv.slice(2), environment = process.env) {
  const paymentDirectory = environment.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments";
  const activationDirectory = environment.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation";
  const intentsPath = resolve(paymentDirectory, "wompi-sandbox-intents.json");
  const paymentsPath = resolve(paymentDirectory, "payments.json");
  const leadsPath = resolve(activationDirectory, "leads.json");
  const command = parseCommandArgs(args);

  return runCommand(command, {
    loadIntent: async (reference) =>
      (await readJsonArray(intentsPath)).find((intent) => intent.reference === reference) ?? null,
    queryTransactions: async (reference) => {
      const config = resolveSandboxConfig(environment);
      const response = await fetch(
        `https://sandbox.wompi.co/v1/transactions?reference=${encodeURIComponent(reference)}`,
        { method: "GET", headers: { Authorization: `Bearer ${config.privateKey}` }, cache: "no-store" }
      );
      if (!response.ok) throw new Error(`Wompi Sandbox lookup failed with HTTP ${response.status}.`);
      return parseTransactionList(await response.json());
    },
    loadPayments: async (activationLeadId) =>
      (await readJsonArray(paymentsPath)).filter((payment) => payment.activationLeadId === activationLeadId),
    apply: async ({ intent, transaction }) => {
      const [intents, payments, leads] = await Promise.all([
        readJsonArray(intentsPath),
        readJsonArray(paymentsPath),
        readJsonArray(leadsPath)
      ]);
      const intentIndex = intents.findIndex((candidate) => candidate.id === intent.id);
      if (intentIndex < 0) throw new Error("Wompi payment intent disappeared before APPLY.");
      const lead = leads.find((candidate) => candidate.id === intent.activationLeadId);
      if (!lead) throw new Error("Activation lead was not found before APPLY.");

      const paymentExists = hasPayment(payments, intent);
      if (!paymentExists) {
        const now = new Date().toISOString();
        payments.push(createPayment(intent, transaction, lead, now));
        await writeJsonArray(paymentsPath, payments);
      }
      intents[intentIndex] = approveIntent(intent, transaction.id, new Date().toISOString());
      await writeJsonArray(intentsPath, intents);
    }
  });
}

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entrypoint) {
  main()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Wompi reconciliation failed.";
      process.stderr.write(`${JSON.stringify({ error: message })}\n`);
      process.exitCode = 1;
    });
}
