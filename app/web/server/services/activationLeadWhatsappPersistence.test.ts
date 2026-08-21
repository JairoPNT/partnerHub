import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { activationLeadService } from "./activationLeadService.ts";

const correct = "+573188430283";
const incorrect = "+5673188430283";

function input(whatsapp = correct, onboardingWhatsapp = correct) {
  return {
    fullName: "Jairo Pinto",
    whatsapp,
    email: "jairo@example.com",
    brandName: "Jairo Pinto",
    mainProduct: "",
    paymentMethod: "direct" as const,
    termsAccepted: true as const,
    offerCode: "BUSINESS_ONLY" as const,
    status: "CONTACTED" as const,
    siteId: "jairo-pinto",
    onboardingData: {
      domain: "jairopinto.pro",
      whatsapp: onboardingWhatsapp,
      phone: correct
    }
  };
}

test("persistent activation operations reject conflicts before mutating leads.json", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "partner-whatsapp-persistence-"));
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = directory;

  const created = await activationLeadService.createInternal(input(correct, "+57 318 843 0283"));
  const path = resolve(directory, "leads.json");
  const initial = await readFile(path, "utf8");

  await assert.rejects(
    activationLeadService.createInternal(input(correct, incorrect)),
    /PARTNER_WHATSAPP_CONFLICT/
  );
  assert.equal(await readFile(path, "utf8"), initial);

  await assert.rejects(
    activationLeadService.updateOnboarding(created.onboardingToken, { whatsapp: incorrect }),
    /PARTNER_WHATSAPP_CONFLICT/
  );
  assert.equal(await readFile(path, "utf8"), initial);

  await assert.rejects(
    activationLeadService.updateStatus(created.lead.id, { onboardingData: { whatsapp: incorrect } }),
    /PARTNER_WHATSAPP_CONFLICT/
  );
  assert.equal(await readFile(path, "utf8"), initial);

  const allowed = await activationLeadService.updateOnboarding(created.onboardingToken, {
    whatsapp: "573188430283",
    phone: "+57 601 555 0101"
  });
  assert.equal(allowed.onboardingData.whatsapp, "573188430283");
  assert.equal(allowed.onboardingData.phone, "+57 601 555 0101");
  assert.notEqual(await readFile(path, "utf8"), initial);
});
