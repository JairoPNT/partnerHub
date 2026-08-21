import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { PATCH } from "@/app/api/public/onboarding/[token]/route";
import { activationLeadService } from "./activationLeadService.ts";

test("public onboarding maps WhatsApp conflict to stable 409 without mutation", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "partner-whatsapp-route-"));
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = directory;
  const created = await activationLeadService.createInternal({
    fullName: "Jairo Pinto", whatsapp: "+573188430283", email: "jairo@example.com",
    brandName: "Jairo Pinto", mainProduct: "", paymentMethod: "direct", termsAccepted: true,
    offerCode: "BUSINESS_ONLY", status: "CONTACTED", siteId: "jairo-pinto",
    onboardingData: { domain: "jairopinto.pro", whatsapp: "+573188430283" }
  });
  const path = resolve(directory, "leads.json");
  const before = await readFile(path, "utf8");
  const request = new Request("https://app.partnerhub.club/api/public/onboarding/token", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ whatsapp: "+5673188430283" })
  });

  const response = await PATCH(request, { params: Promise.resolve({ token: created.onboardingToken }) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "PARTNER_WHATSAPP_CONFLICT" });
  assert.equal(await readFile(path, "utf8"), before);
});
