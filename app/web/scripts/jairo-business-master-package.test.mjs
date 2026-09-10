import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  APPLY_MODE,
  applyBusinessMasterPackage,
  planBusinessMasterPackage
} from "./jairo-business-master-package.mjs";

const canonicalConfig = `const CONFIG = {
  ecosystemType: "BUSINESS",
  site: { id: "ganomaster-business", appName: "ganomaster-business" },
  distributor: {
    brandName: "", firstName: "", fullName: "", role: "",
    whatsappNumber: "", phoneNumber: "", displayPhone: "",
    ctaUrl: "", defaultMessage: ""
  },
  hero: {},
  vsl: { provider: "custom", embedUrl: "https://media.example/business.mp4" },
  cta: { primaryUrl: "", secondaryUrl: "", directRegisterUrl: "" }
};
`;

async function fixture() {
  const root = await mkdtemp(resolve(os.tmpdir(), "partnerhub-business-master-"));
  const outputRoot = resolve(root, "output");
  const templateDirectory = resolve(root, "template");
  await Promise.all([mkdir(outputRoot), mkdir(templateDirectory)]);
  await Promise.all([
    writeFile(resolve(templateDirectory, "app.js"), "app"),
    writeFile(resolve(templateDirectory, "config.js"), canonicalConfig),
    writeFile(resolve(templateDirectory, "favicon.svg"), "<svg/>"),
    writeFile(resolve(templateDirectory, "index.html"), "<html></html>"),
    writeFile(resolve(templateDirectory, "styles.css"), "body{}")
  ]);
  return {
    root,
    options: { outputRoot, templateDirectory },
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

test("PREVIEW is read-only and plans the missing canonical Business master", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.mode, "PREVIEW");
    assert.equal(preview.changed, false);
    assert.equal(preview.blocked, false);
    assert.equal(preview.disposition, "CREATE_LOCAL_MASTER_PACKAGE");
    assert.match(preview.planHash, /^[0-9a-f]{64}$/);
    assert.equal(preview.planMaterial.destinationHash, "ABSENT");
    assert.equal(preview.safety.providerCallsMade, false);
    assert.equal(preview.safety.localWritesMade, false);
  } finally {
    await item.cleanup();
  }
});

test("missing or unsafe canonical template blocks before writes", async () => {
  const item = await fixture();
  try {
    await rm(resolve(item.options.templateDirectory, "app.js"));
    let preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.deepEqual(preview.blockedReasons, ["BUSINESS_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE"]);

    await writeFile(resolve(item.options.templateDirectory, "app.js"), "app");
    await writeFile(resolve(item.options.templateDirectory, "config.js"), canonicalConfig.replace('whatsappNumber: ""', 'whatsappNumber: "573000000000"'));
    preview = await planBusinessMasterPackage(item.options);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("BUSINESS_CANONICAL_MASTER_DISTRIBUTOR_NOT_EMPTY:whatsappNumber"));
  } finally {
    await item.cleanup();
  }
});

test("APPLY rejects mode, confirmation and plan drift without creating destination", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await assert.rejects(
      () => applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: "WRONG", expectedPlanHash: preview.planHash }),
      /CONFIRMATION_REQUIRED/
    );
    await assert.rejects(
      () => applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) }),
      /PLAN_HASH_MISMATCH/
    );
    const after = await planBusinessMasterPackage(item.options);
    assert.equal(after.planMaterial.destinationHash, "ABSENT");
  } finally {
    await item.cleanup();
  }
});

test("authorized APPLY installs deterministic package, journal and cleans claim", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    const result = await applyBusinessMasterPackage({
      ...item.options,
      mode: APPLY_MODE,
      confirmation: APPLY_CONFIRMATION,
      expectedPlanHash: preview.planHash
    });
    assert.equal(result.outcome, "APPLIED");
    assert.equal(result.changed, true);
    assert.equal(result.destination.hash, preview.planMaterial.expectedPackageHash);
    assert.equal(JSON.parse(await readFile(resolve(item.options.outputRoot, "ganomaster-business", "manifest.json"), "utf8")).siteId, "ganomaster-business");
    const rerun = await planBusinessMasterPackage(item.options);
    assert.equal(rerun.blocked, false);
    assert.equal(rerun.disposition, "ALREADY_APPLIED");
    assert.equal(rerun.destination.typographyDirectoryPresent, true);
  } finally {
    await item.cleanup();
  }
});

test("exact rerun is ALREADY_APPLIED and does not rewrite package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
    const rerunPreview = await planBusinessMasterPackage(item.options);
    const result = await applyBusinessMasterPackage({
      ...item.options,
      mode: APPLY_MODE,
      confirmation: APPLY_CONFIRMATION,
      expectedPlanHash: rerunPreview.planHash
    });
    assert.equal(result.outcome, "ALREADY_APPLIED");
    assert.equal(result.changed, false);
  } finally {
    await item.cleanup();
  }
});

test("destination drift and claim collision block fail-closed", async () => {
  const item = await fixture();
  try {
    await mkdir(resolve(item.options.outputRoot, "ganomaster-business"));
    await writeFile(resolve(item.options.outputRoot, "ganomaster-business", "foreign.txt"), "foreign");
    let preview = await planBusinessMasterPackage(item.options);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_DRIFT"));

    await rm(resolve(item.options.outputRoot, "ganomaster-business"), { recursive: true });
    await mkdir(resolve(item.options.outputRoot, ".master-package-claims", "ganomaster-business"), { recursive: true });
    preview = await planBusinessMasterPackage(item.options);
    assert.ok(preview.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_CLAIM_PRESENT"));
  } finally {
    await item.cleanup();
  }
});

test("journal drift blocks an otherwise exact package", async () => {
  const item = await fixture();
  try {
    const preview = await planBusinessMasterPackage(item.options);
    await applyBusinessMasterPackage({ ...item.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
    const journalPath = resolve(item.options.outputRoot, ".master-package-audits", "CDX-20260827-002", "apply.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    journal.expectedPackageHash = "0".repeat(64);
    await writeFile(journalPath, `${JSON.stringify(journal)}\n`);
    const after = await planBusinessMasterPackage(item.options);
    assert.ok(after.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT"));
  } finally {
    await item.cleanup();
  }
});
