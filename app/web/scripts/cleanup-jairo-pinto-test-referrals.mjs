import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const TARGET_SITE_ID = "jairo-pinto-test";

async function atomicWriteJson(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function cleanupJairoPintoTestReferrals({
  storageDirectory,
  apply = false,
  now = new Date()
}) {
  const codesPath = resolve(storageDirectory, "codes.json");
  const referralsPath = resolve(storageDirectory, "referrals.json");
  const [codesSource, referralsSource] = await Promise.all([
    readFile(codesPath, "utf8"),
    readFile(referralsPath, "utf8")
  ]);
  const codes = JSON.parse(codesSource);
  const referrals = JSON.parse(referralsSource);
  const targetCodes = new Set(
    codes.filter((record) => record.siteId === TARGET_SITE_ID).map((record) => record.code)
  );
  const removedCodes = codes.filter((record) => record.siteId === TARGET_SITE_ID);
  const removedReferrals = referrals.filter(
    (record) => record.referrerSiteId === TARGET_SITE_ID || targetCodes.has(record.referrerCode)
  );
  const keptCodes = codes.filter((record) => record.siteId !== TARGET_SITE_ID);
  const keptReferrals = referrals.filter(
    (record) => record.referrerSiteId !== TARGET_SITE_ID && !targetCodes.has(record.referrerCode)
  );

  const result = {
    mode: apply ? "APPLY" : "DRY_RUN",
    targetSiteId: TARGET_SITE_ID,
    removedCodeCount: removedCodes.length,
    removedReferralCount: removedReferrals.length,
    removedReferrals: removedReferrals.map(({ referredSiteId, status }) => ({ referredSiteId, status })),
    remainingCodeCount: keptCodes.length,
    remainingReferralCount: keptReferrals.length,
    backupDirectory: null
  };

  if (!apply) return result;

  const backupName = `${now.toISOString().replaceAll(":", "-")}-${TARGET_SITE_ID}`;
  const backupDirectory = resolve(storageDirectory, "backups", backupName);
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(backupDirectory, "codes.json"), codesSource, "utf8"),
    writeFile(resolve(backupDirectory, "referrals.json"), referralsSource, "utf8")
  ]);
  await atomicWriteJson(codesPath, keptCodes);
  await atomicWriteJson(referralsPath, keptReferrals);

  return { ...result, backupDirectory };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.split("=")[1];

  if (apply && confirmation !== TARGET_SITE_ID) {
    throw new Error(`Apply requires --confirm=${TARGET_SITE_ID}.`);
  }

  const storageDirectory =
    process.env.PRODUCT_PAGE_REFERRAL_DIR ?? "/data/generated-sites/.referrals";
  const result = await cleanupJairoPintoTestReferrals({ storageDirectory, apply });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
