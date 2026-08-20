import assert from "node:assert/strict";
import test from "node:test";

import { requiresProductCommerceVerification } from "./productPageVerificationContract.ts";

test("runs product purchase checks only for PRODUCT", () => {
  assert.equal(requiresProductCommerceVerification("PRODUCT"), true);
  assert.equal(requiresProductCommerceVerification("BUSINESS"), false);
  assert.equal(requiresProductCommerceVerification("PERSONAL_BRAND"), false);
});
