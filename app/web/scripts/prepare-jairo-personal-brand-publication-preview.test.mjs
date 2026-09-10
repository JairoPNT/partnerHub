import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { preparePersonalBrandPublicationPreview } from "./prepare-jairo-personal-brand-publication-preview.mjs";
import { planPersonalBrandMasterPackage } from "./jairo-personal-brand-master-package.mjs";

const OWNER_KEY = "f403f29e-95c8-4825-9320-967376443020";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const source = {
  ecosystemType: "PERSONAL_BRAND",
  site: { id: "jairo-pinto", appName: "jairo-pinto" }
};
const entitlement = {
  activationLeadId: OWNER_KEY,
  commercialState: "KNOWN",
  includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
  expectedTargets: [{ ecosystemType: "PERSONAL_BRAND", role: "ROOT", publicHost: "jairopinto.pro" }]
};
const target = {
  version: 2,
  ownerKey: OWNER_KEY,
  siteId: "jairo-pinto",
  ecosystemType: "PERSONAL_BRAND",
  baseDomain: "jairopinto.pro",
  publicHost: "jairopinto.pro",
  remoteRoot: "/provider-derived/non-root-directory",
  provisioningState: "READY",
  dnsState: "RESOLVED",
  sslState: "READY",
  publicationState: "PENDING"
};

const templateFiles = {
  "app.js": "app",
  "config.js": `const CONFIG = { ecosystemType: "PERSONAL_BRAND", site: { id: "ganomaster-personal-brand", appName: "ganomaster-personal-brand" } };`,
  "favicon.svg": "<svg/>",
  "index.html": "<html/>",
  "styles.css": "body{}"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const inventoryHash = (files) => sha256(JSON.stringify(files.map(({ path, hash }) => ({ path, hash }))));
const htaccess = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

async function writePackage(directory, templateDirectory) {
  await mkdir(resolve(directory, "tipografia"), { recursive: true });
  const templateEntries = Object.entries(templateFiles).map(([path, contents]) => ({ path, hash: sha256(contents) })).sort((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    schemaVersion: 1,
    siteId: "ganomaster-personal-brand",
    ecosystemType: "PERSONAL_BRAND",
    publicHost: "brand.ganomaster.pro",
    source: "CANONICAL_PERSONAL_BRAND_TEMPLATE",
    canonicalTemplateHash: inventoryHash(templateEntries),
    files: ["app.js", "config.js", "favicon.svg", "index.html", "styles.css", ".htaccess", "tipografia/"]
  };
  await Promise.all([
    ...Object.entries(templateFiles).map(([path, contents]) => writeFile(resolve(directory, path), contents)),
    ...Object.entries(templateFiles).map(([path, contents]) => writeFile(resolve(templateDirectory, path), contents)),
    writeFile(resolve(directory, ".htaccess"), htaccess),
    writeFile(resolve(directory, "manifest.json"), json(manifest))
  ]);
}

async function fixture({ withTarget = true, withPackage = true } = {}) {
  const root = await mkdtemp(resolve(os.tmpdir(), "partnerhub-personal-brand-publication-"));
  const sourceDirectory = resolve(root, "sources");
  const outputDirectory = resolve(root, "output");
  const templateDirectory = resolve(root, "template");
  const entitlementPath = resolve(root, "entitlement.json");
  await Promise.all([mkdir(sourceDirectory), mkdir(outputDirectory), mkdir(templateDirectory)]);
  await Promise.all([
    writeFile(resolve(sourceDirectory, "jairo-pinto.json"), json(source)),
    writeFile(entitlementPath, json(entitlement))
  ]);
  if (withTarget) {
    await mkdir(resolve(sourceDirectory, ".publishing-targets"));
    await writeFile(resolve(sourceDirectory, ".publishing-targets", "jairo-pinto.json"), json(target));
  }
  if (withPackage) await writePackage(resolve(outputDirectory, "ganomaster-personal-brand"), templateDirectory);
  return {
    root, sourceDirectory, outputDirectory, entitlementPath, templateDirectory,
    targetPath: resolve(sourceDirectory, ".publishing-targets", "jairo-pinto.json"),
    packageDirectory: resolve(outputDirectory, "ganomaster-personal-brand"),
    cleanup: () => rm(root, { recursive: true, force: true })
  };
}

test("previews a ready Personal Brand apex without mutations", async () => {
  const item = await fixture();
  try {
    const before = await Promise.all([readFile(item.targetPath), readFile(resolve(item.packageDirectory, "manifest.json"))]);
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.equal(preview.changed, false);
    assert.equal(preview.blocked, false);
    assert.equal(preview.safety.providerCallsMade, false);
    assert.equal(preview.safety.sftpAdapterCreated, false);
    assert.equal(preview.safety.localWritesMade, false);
    assert.match(preview.planHash, /^[a-f0-9]{64}$/);
    assert.equal(preview.planMaterial.identity.publicHost, "jairopinto.pro");
    assert.deepEqual(await Promise.all([readFile(item.targetPath), readFile(resolve(item.packageDirectory, "manifest.json"))]), before);
  } finally { await item.cleanup(); }
});

test("blocks an absent target without synthesizing it", async () => {
  const item = await fixture({ withTarget: false });
  try {
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_TARGET_MISSING"));
    await assert.rejects(() => lstat(item.targetPath), { code: "ENOENT" });
  } finally { await item.cleanup(); }
});

test("blocks a non-apex Personal Brand target", async () => {
  const item = await fixture();
  try {
    await writeFile(item.targetPath, json({ ...target, publicHost: "brand.jairopinto.pro" }));
    const preview = await preparePersonalBrandPublicationPreview(item);
    assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_APEX_TARGET_INVALID"));
  } finally { await item.cleanup(); }
});

for (const [name, invalidTarget] of [
  ["missing remote root", { ...target, remoteRoot: "" }],
  ["non-ready provisioning", { ...target, provisioningState: "PENDING" }],
  ["unresolved DNS", { ...target, dnsState: "PENDING" }],
  ["unready SSL", { ...target, sslState: "PENDING" }]
]) {
  test(`blocks ${name}`, async () => {
    const item = await fixture();
    try {
      await writeFile(item.targetPath, json(invalidTarget));
      const preview = await preparePersonalBrandPublicationPreview(item);
      assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_TARGET_NOT_READY"));
    } finally { await item.cleanup(); }
  });
}

test("blocks an invalid source identity", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.sourceDirectory, "jairo-pinto.json"), json({ ...source, site: { id: "wrong" } }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_SOURCE_IDENTITY_INVALID"));
  } finally { await item.cleanup(); }
});

test("blocks an entitlement without Personal Brand", async () => {
  const item = await fixture();
  try {
    await writeFile(item.entitlementPath, json({ ...entitlement, includedEcosystems: ["BUSINESS"] }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_ENTITLEMENT_INVALID"));
  } finally { await item.cleanup(); }
});

test("blocks an entitlement whose Personal Brand target is not the approved apex", async () => {
  const item = await fixture();
  try {
    await writeFile(item.entitlementPath, json({ ...entitlement, expectedTargets: [{ ecosystemType: "PERSONAL_BRAND", role: "SUBDOMAIN", publicHost: "brand.jairopinto.pro" }] }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_ENTITLEMENT_INVALID"));
  } finally { await item.cleanup(); }
});

test("blocks a missing master package", async () => {
  const item = await fixture({ withPackage: false });
  try {
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_MASTER_PACKAGE_MISSING"));
  } finally { await item.cleanup(); }
});

test("blocks master-package inventory drift", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.packageDirectory, "foreign.txt"), "unexpected");
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
  } finally { await item.cleanup(); }
});

test("blocks a canonical master package whose app content drifts", async () => {
  const item = await fixture();
  try {
    await writeFile(resolve(item.packageDirectory, "app.js"), "modified-app");
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
  } finally { await item.cleanup(); }
});

test("blocks a master package missing its required typography directory", async () => {
  const item = await fixture();
  try {
    await rm(resolve(item.packageDirectory, "tipografia"), { recursive: true, force: true });
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
  } finally { await item.cleanup(); }
});

test("blocks a remote root that normalizes to the filesystem root", async () => {
  const item = await fixture();
  try {
    await writeFile(item.targetPath, json({ ...target, remoteRoot: "/provider/.." }));
    assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes("PERSONAL_BRAND_TARGET_NOT_READY"));
  } finally { await item.cleanup(); }
});

test("blocks symlink source, entitlement, and target artifacts", async () => {
  const item = await fixture();
  try {
    const replacements = [
      [resolve(item.sourceDirectory, "jairo-pinto.json"), resolve(item.root, "source-real.json"), "PERSONAL_BRAND_SOURCE_MISSING_OR_UNREADABLE"],
      [item.entitlementPath, resolve(item.root, "entitlement-real.json"), "PERSONAL_BRAND_ENTITLEMENT_INVALID"],
      [item.targetPath, resolve(item.root, "target-real.json"), "PERSONAL_BRAND_APEX_TARGET_INVALID"]
    ];
    for (const [artifact, replacement, reason] of replacements) {
      const bytes = await readFile(artifact);
      await mkdir(replacement);
      await rm(artifact);
      await symlink(replacement, artifact, "junction");
      assert.ok((await preparePersonalBrandPublicationPreview(item)).blockedReasons.includes(reason));
      await rm(artifact);
      await writeFile(artifact, bytes);
    }
  } finally { await item.cleanup(); }
});

for (const artifact of ["source", "entitlement", "target"]) {
  for (const value of [null, false, 0, "", true, "invalid", []]) {
    test(`blocks non-object ${artifact} JSON ${JSON.stringify(value)}`, async () => {
      const item = await fixture();
      try {
        const paths = { source: resolve(item.sourceDirectory, "jairo-pinto.json"), entitlement: item.entitlementPath, target: item.targetPath };
        const reasons = { source: "PERSONAL_BRAND_SOURCE_MISSING_OR_UNREADABLE", entitlement: "PERSONAL_BRAND_ENTITLEMENT_INVALID", target: "PERSONAL_BRAND_APEX_TARGET_INVALID" };
        await writeFile(paths[artifact], json(value));
        const preview = await preparePersonalBrandPublicationPreview(item);
        assert.equal(preview.blocked, true);
        assert.ok(preview.blockedReasons.includes(reasons[artifact]));
      } finally { await item.cleanup(); }
    });
  }
}

for (const expectedTargets of [null, false, 0, "invalid", {}]) {
  test(`blocks non-array expectedTargets ${JSON.stringify(expectedTargets)} without throwing`, async () => {
    const item = await fixture();
    try {
      await writeFile(item.entitlementPath, json({ ...entitlement, expectedTargets }));
      const preview = await preparePersonalBrandPublicationPreview(item);
      assert.equal(preview.blocked, true);
      assert.ok(preview.blockedReasons.includes("PERSONAL_BRAND_ENTITLEMENT_INVALID"));
    } finally { await item.cleanup(); }
  });
}

for (const directory of ["source root", "publishing-targets", "entitlement parent", "source ancestor", "entitlement ancestor"]) {
  test(`blocks linked ${directory} before reading artifact bytes`, async () => {
    const item = await fixture();
    try {
      let hashKey;
      let reason;
      if (directory === "publishing-targets") {
        const original = resolve(item.sourceDirectory, ".publishing-targets");
        const relocated = resolve(item.root, "real-targets");
        await rename(original, relocated);
        await symlink(relocated, original, "junction");
        hashKey = "targetHash";
        reason = "PERSONAL_BRAND_APEX_TARGET_INVALID";
      } else {
        const link = resolve(item.root, "linked-parent");
        const isSource = directory.startsWith("source");
        const direct = directory === "source root";
        await symlink(direct ? item.sourceDirectory : item.root, link, "junction");
        if (isSource) item.sourceDirectory = direct ? link : resolve(link, "sources");
        else {
          if (directory === "entitlement ancestor") {
            await mkdir(resolve(item.root, "nested"));
            await writeFile(resolve(item.root, "nested", "entitlement.json"), json(entitlement));
            item.entitlementPath = resolve(link, "nested", "entitlement.json");
          } else item.entitlementPath = resolve(link, "entitlement.json");
        }
        hashKey = isSource ? "sourceHash" : "entitlementHash";
        reason = isSource ? "PERSONAL_BRAND_SOURCE_MISSING_OR_UNREADABLE" : "PERSONAL_BRAND_ENTITLEMENT_INVALID";
      }
      const preview = await preparePersonalBrandPublicationPreview(item);
      assert.equal(preview.blocked, true);
      assert.ok(preview.blockedReasons.includes(reason));
      assert.equal(preview.planMaterial[hashKey], "UNREADABLE");
    } finally { await item.cleanup(); }
  });
}

for (const field of ["provisioningState", "dnsState", "sslState", "publicationState"]) {
  for (const invalidValue of [{ syntheticCredential: "DO_NOT_DISCLOSE_TEST_SECRET" }, "DO_NOT_DISCLOSE_TEST_SECRET", ["READY"], 7]) {
    test(`redacts invalid ${field} ${JSON.stringify(invalidValue)}`, async () => {
      const item = await fixture();
      try {
        await writeFile(item.targetPath, json({ ...target, [field]: invalidValue }));
        const preview = await preparePersonalBrandPublicationPreview(item);
        assert.equal(preview.blocked, true);
        assert.equal(preview.planMaterial.targetReadiness[field], null);
        assert.equal(preview.target[field], null);
        assert.equal(JSON.stringify(preview).includes("syntheticCredential"), false);
        assert.equal(JSON.stringify(preview).includes("DO_NOT_DISCLOSE_TEST_SECRET"), false);
      } finally { await item.cleanup(); }
    });
  }
}

for (const change of ["required typography removal", "canonical template byte drift"]) {
  test(`invalidates reviewed master and publication plan hashes on ${change}`, async () => {
    const item = await fixture();
    try {
      const masterOptions = { outputRoot: item.outputDirectory, templateDirectory: item.templateDirectory };
      const beforeMaster = await planPersonalBrandMasterPackage(masterOptions);
      const before = await preparePersonalBrandPublicationPreview(item);
      assert.equal(beforeMaster.blocked, false);
      assert.equal(before.blocked, false);
      assert.equal((await preparePersonalBrandPublicationPreview(item)).planHash, before.planHash);
      if (change === "required typography removal") await rm(resolve(item.packageDirectory, "tipografia"), { recursive: true });
      else await writeFile(resolve(item.templateDirectory, "app.js"), "changed canonical bytes");
      const afterMaster = await planPersonalBrandMasterPackage(masterOptions);
      const after = await preparePersonalBrandPublicationPreview(item);
      assert.equal(afterMaster.destination.hash, beforeMaster.destination.hash);
      assert.equal(after.planMaterial.masterPackageHash, before.planMaterial.masterPackageHash);
      assert.equal(afterMaster.blocked, true);
      assert.equal(after.blocked, true);
      assert.ok(after.blockedReasons.includes("PERSONAL_BRAND_PACKAGE_DRIFT"));
      assert.notEqual(afterMaster.planHash, beforeMaster.planHash);
      assert.notEqual(after.planHash, before.planHash);
    } finally { await item.cleanup(); }
  });
}
