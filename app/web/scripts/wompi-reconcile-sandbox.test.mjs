/* global URL, process */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ALLOWED_REFERENCES,
  parseCommandArgs,
  runCommand
} from "./wompi-reconcile-sandbox.mjs";

function intent(reference) {
  return {
    id: "intent-1",
    activationLeadId: "lead-1",
    reference,
    amountCop: 180000,
    amountInCents: 18000000,
    currency: "COP",
    status: "PENDING"
  };
}

function dependencies(reference) {
  let applies = 0;
  return {
    get applies() { return applies; },
    value: {
      loadIntent: async () => intent(reference),
      queryTransactions: async () => [{
        id: "transaction-1",
        reference,
        status: "APPROVED",
        amount_in_cents: 18000000,
        currency: "COP"
      }],
      loadPayments: async () => [],
      apply: async () => { applies += 1; }
    }
  };
}

test("the JavaScript artifact executes with standard Node flags", () => {
  const artifact = fileURLToPath(new URL("./wompi-reconcile-sandbox.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [artifact], {
    encoding: "utf8"
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /explicit --reference/);
  assert.doesNotMatch(result.stderr, /bad option|ERR_UNKNOWN_FILE_EXTENSION/);
});

test("DRY_RUN remains the default for both authorized references", async () => {
  for (const reference of ALLOWED_REFERENCES) {
    const deps = dependencies(reference);
    const result = await runCommand(parseCommandArgs(["--reference", reference]), deps.value);
    assert.equal(result.mode, "DRY_RUN");
    assert.equal(result.validation, "VALID");
    assert.equal(deps.applies, 0);
  }
});

test("APPLY cannot be selected without the explicit flag", async () => {
  const reference = ALLOWED_REFERENCES[0];
  const deps = dependencies(reference);
  assert.equal(parseCommandArgs(["--reference", reference]).mode, "DRY_RUN");
  await assert.rejects(runCommand({ reference, mode: "APPLY" }, deps.value), /explicit --apply/);
  assert.equal(deps.applies, 0);
});
