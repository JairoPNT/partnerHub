import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  planPersonalBrandMasterPackage,
  runJairoPersonalBrandMasterPackage
} from "./jairo-personal-brand-master-package.mjs";

const canonicalConfig = `const CONFIG = {
  ecosystemType: "PERSONAL_BRAND",
  site: { id: "ganomaster-personal-brand", appName: "ganomaster-personal-brand" }
};`;

async function fixture() {
  const root = await mkdtemp(resolve(os.tmpdir(), "partnerhub-personal-brand-master-"));
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
    outputRoot,
    root,
    templateDirectory,
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

test("plans a deterministic, read-only missing Personal Brand master package", async () => {
  const item = await fixture();
  try {
    const options = { outputRoot: item.outputRoot, templateDirectory: item.templateDirectory };
    const preview = await planPersonalBrandMasterPackage(options);
    const repeated = await runJairoPersonalBrandMasterPackage(options);

    assert.equal(preview.changed, false);
    assert.equal(preview.safety.localWritesMade, false);
    assert.equal(preview.safety.providerCallsMade, false);
    assert.equal(preview.disposition, "CREATE_LOCAL_MASTER_PACKAGE");
    assert.equal(preview.blocked, false);
    assert.match(preview.planHash, /^[a-f0-9]{64}$/);
    assert.equal(preview.destination.present, false);
    assert.equal(preview.destination.typographyDirectoryPresent, false);
    await assert.rejects(() => lstat(resolve(item.outputRoot, "ganomaster-personal-brand")), { code: "ENOENT" });
    assert.equal(repeated.planMaterial.canonicalTemplateHash, preview.planMaterial.canonicalTemplateHash);
    assert.equal(repeated.planMaterial.expectedPackageHash, preview.planMaterial.expectedPackageHash);
    assert.equal(repeated.planHash, preview.planHash);
  } finally {
    await item.cleanup();
  }
});

test("rejects symbolic-link template and destination roots before reading their contents", async () => {
  const item = await fixture();
  try {
    const templateLink = resolve(item.root, "template-link");
    const outputLink = resolve(item.root, "output-link");
    await symlink(item.templateDirectory, templateLink, "junction");
    await symlink(item.outputRoot, outputLink, "junction");

    let preview = await planPersonalBrandMasterPackage({ ...item, templateDirectory: templateLink });
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_CANONICAL_TEMPLATE_SYMLINK_FORBIDDEN"));

    preview = await planPersonalBrandMasterPackage({ ...item, outputRoot: outputLink });
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_MASTER_PACKAGE_DESTINATION_SYMLINK_FORBIDDEN"));

    const destinationTarget = resolve(item.root, "destination-target");
    await mkdir(destinationTarget);
    await symlink(destinationTarget, resolve(item.outputRoot, "ganomaster-personal-brand"), "junction");
    preview = await planPersonalBrandMasterPackage(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_MASTER_PACKAGE_DESTINATION_SYMLINK_FORBIDDEN"));
  } finally {
    await item.cleanup();
  }
});

test("rejects unexpected special template entries without reading them", async () => {
  const item = await fixture();
  try {
    const unexpectedLink = resolve(item.templateDirectory, "escaped-template-entry");
    await symlink(item.outputRoot, unexpectedLink, "junction");

    const preview = await planPersonalBrandMasterPackage(item);

    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_CANONICAL_TEMPLATE_SPECIAL_FILE_FORBIDDEN"));
  } finally {
    await item.cleanup();
  }
});

test("rejects a non-Personal Brand canonical template identity", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.templateDirectory, "config.js"), canonicalConfig.replace("PERSONAL_BRAND", "BUSINESS"));
    let preview = await planPersonalBrandMasterPackage(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_CANONICAL_TEMPLATE_IDENTITY_INVALID"));

    await writeFile(resolve(item.templateDirectory, "config.js"), canonicalConfig.replace("ganomaster-personal-brand", "wrong-site"));
    preview = await planPersonalBrandMasterPackage(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_CANONICAL_TEMPLATE_IDENTITY_INVALID"));
  } finally {
    await item.cleanup();
  }
});

test("reports destination inventory drift without changing the destination", async () => {
  const item = await fixture();
  try {
    const destination = resolve(item.outputRoot, "ganomaster-personal-brand");
    await mkdir(destination);
    await writeFile(resolve(destination, "unexpected.txt"), "foreign");

    const preview = await planPersonalBrandMasterPackage(item);

    assert.equal(preview.changed, false);
    assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_MASTER_PACKAGE_DRIFT"));
    assert.equal(preview.destination.present, true);
  } finally {
    await item.cleanup();
  }
});
