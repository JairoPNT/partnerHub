import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const TARGET_SITE_ID = "claudia-calero";

function validHttpsUrl(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is missing.`);
  }

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
}

async function atomicWriteJson(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function reconcileClaudiaHeroes({
  sourceDirectory,
  activationDirectory,
  apply = false,
  now = new Date()
}) {
  const sourcePath = resolve(sourceDirectory, `${TARGET_SITE_ID}.json`);
  const leadsPath = resolve(activationDirectory, "leads.json");
  const [sourceText, leadsText] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(leadsPath, "utf8")
  ]);
  const source = JSON.parse(sourceText);
  const leads = JSON.parse(leadsText);
  const desktop = validHttpsUrl(source?.hero?.desktop, "configuration.hero.desktop");
  const mobile = validHttpsUrl(source?.hero?.mobile, "configuration.hero.mobile");
  const matches = leads
    .map((lead, index) => ({ lead, index }))
    .filter(({ lead }) => lead?.siteId === TARGET_SITE_ID);

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one activation lead for ${TARGET_SITE_ID}; found ${matches.length}.`);
  }

  const { lead, index } = matches[0];
  const previous = {
    heroDesktopUrl: lead.onboardingData?.heroDesktopUrl ?? null,
    heroMobileUrl: lead.onboardingData?.heroMobileUrl ?? null
  };
  const nextHeroes = { heroDesktopUrl: desktop, heroMobileUrl: mobile };
  const changed = previous.heroDesktopUrl !== desktop || previous.heroMobileUrl !== mobile;
  const result = {
    mode: apply ? "APPLY" : "DRY_RUN",
    targetSiteId: TARGET_SITE_ID,
    changed,
    previous,
    next: nextHeroes,
    backupPath: null
  };

  if (!apply || !changed) return result;

  const timestamp = now.toISOString();
  const updatedLead = {
    ...lead,
    onboardingData: { ...lead.onboardingData, ...nextHeroes },
    onboardingUpdatedAt: timestamp,
    updatedAt: timestamp
  };
  const updatedLeads = [...leads];
  updatedLeads[index] = updatedLead;
  const backupDirectory = resolve(activationDirectory, "backups");
  const backupPath = resolve(
    backupDirectory,
    `${timestamp.replaceAll(":", "-")}-${TARGET_SITE_ID}-hero-reconciliation-leads.json`
  );

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, leadsText, "utf8");
  await atomicWriteJson(leadsPath, updatedLeads);

  return { ...result, backupPath };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.split("=")[1];

  if (apply && confirmation !== TARGET_SITE_ID) {
    throw new Error(`Apply requires --confirm=${TARGET_SITE_ID}.`);
  }

  const sourceDirectory = process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources";
  const activationDirectory = process.env.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation";
  const result = await reconcileClaudiaHeroes({ sourceDirectory, activationDirectory, apply });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
