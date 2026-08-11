import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_SITE_ID = "claudia-calero";

function parseSiteId(value) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error("siteId must be a lowercase slug.");
  }
  return value;
}

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

export async function reconcilePartnerHeroes({
  siteId = DEFAULT_SITE_ID,
  sourceDirectory,
  activationDirectory,
  apply = false,
  now = new Date()
}) {
  const targetSiteId = parseSiteId(siteId);
  const sourcePath = resolve(sourceDirectory, `${targetSiteId}.json`);
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
    .filter(({ lead }) => lead?.siteId === targetSiteId);

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one activation lead for ${targetSiteId}; found ${matches.length}.`);
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
    targetSiteId,
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
    `${timestamp.replaceAll(":", "-")}-${targetSiteId}-hero-reconciliation-leads.json`
  );

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, leadsText, "utf8");
  await atomicWriteJson(leadsPath, updatedLeads);

  return { ...result, backupPath };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const requestedSiteId = process.argv.find((argument) => argument.startsWith("--site-id="))?.split("=")[1];
  const targetSiteId = parseSiteId(requestedSiteId ?? DEFAULT_SITE_ID);
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.split("=")[1];

  if (apply && confirmation !== targetSiteId) {
    throw new Error(`Apply requires --confirm=${targetSiteId}.`);
  }

  const sourceDirectory = process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources";
  const activationDirectory = process.env.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation";
  const result = await reconcilePartnerHeroes({ siteId: targetSiteId, sourceDirectory, activationDirectory, apply });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export const reconcileClaudiaHeroes = reconcilePartnerHeroes;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
