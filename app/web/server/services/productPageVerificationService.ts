import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { z } from "zod";

import { activationLeadService } from "@/server/services/activationLeadService";
import { productPageHistoryService } from "@/server/services/productPageHistoryService";
import { productPageGenerationInputSchema } from "@/server/services/productPageGenerationService";
import { getMasterSiteDomainBySiteId } from "@/server/services/ecosystemService";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { getPublishingTarget } from "@/server/services/subdomainProvisioningService";
import { resolveVerificationHost } from "@/server/services/publicationTargetResolver";

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

export const productPageVerificationInputSchema = z.object({
  siteId: siteIdSchema
});

export type ProductPageVerificationInput = z.infer<typeof productPageVerificationInputSchema>;

export type ProductPageVerificationCheck = {
  name: string;
  status: "PASS" | "FAIL";
  expected?: unknown;
  actual?: unknown;
  message?: string;
};

export type ProductPageVerificationResult = {
  siteId: string;
  domain: string | null;
  verifiedAt: string;
  status: "VERIFIED" | "VERIFY_FAILED";
  checks: ProductPageVerificationCheck[];
};

type PublicConfig = {
  site?: {
    id?: unknown;
    domain?: unknown;
  };
  distributor?: {
    brandName?: unknown;
    fullName?: unknown;
    whatsappNumber?: unknown;
    purchaseUrl?: unknown;
  };
  hero?: {
    desktop?: unknown;
    mobile?: unknown;
  };
};

const fetchTimeoutMs = 15_000;

function getVerificationDirectory() {
  return resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", ".verifications");
}

function verificationPath(siteId: string) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = getVerificationDirectory();
  const target = resolve(root, `${safeSiteId}.json`);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Product page verification path escaped the configured directory.");
  }

  return target;
}

function withCacheBuster(url: string, verifiedAt: string) {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set("partnerhub_verify", `${Date.parse(verifiedAt)}`);
  return parsedUrl.toString();
}

function hasVersionedAssetReference(html: string, assetName: "config.js" | "app.js") {
  return new RegExp(`<script\\b[^>]+src=["']${assetName}(?:\\?v=[^"']+)?["'][^>]*>`, "i").test(html);
}

async function fetchText(url: string, verifiedAt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(withCacheBuster(url, verifiedAt), {
      cache: "no-store",
      signal: controller.signal
    });

    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch public page.";
    return { ok: false, status: null, body: "", error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function readConfig(configSource: string): PublicConfig | null {
  const match = configSource.match(/const\s+CONFIG\s*=\s*([\s\S]*?);\s*(?:if\s*\(|$)/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]) as PublicConfig;
  } catch {
    return null;
  }
}

function addMatchCheck(
  checks: ProductPageVerificationCheck[],
  name: string,
  expected: unknown,
  actual: unknown
) {
  checks.push({
    name,
    status: Object.is(actual, expected) ? "PASS" : "FAIL",
    expected,
    actual
  });
}

function addPresenceCheck(
  checks: ProductPageVerificationCheck[],
  name: string,
  present: boolean,
  expected: unknown,
  actual: unknown
) {
  checks.push({
    name,
    status: present ? "PASS" : "FAIL",
    expected,
    actual
  });
}

async function saveVerification(result: ProductPageVerificationResult) {
  const directory = getVerificationDirectory();
  const target = verificationPath(result.siteId);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

async function recordVerificationHistory(result: ProductPageVerificationResult) {
  await productPageHistoryService.append({
    siteId: result.siteId,
    type: result.status,
    occurredAt: result.verifiedAt,
    domain: result.domain,
    verificationStatus: result.status,
    failedChecks: result.checks.filter((check) => check.status === "FAIL"),
    message:
      result.status === "VERIFIED"
        ? "Public product page verified successfully."
        : "Public product page verification failed."
  });
}

async function getLastVerification(siteId: string) {
  try {
    return JSON.parse(await readFile(verificationPath(siteId), "utf8")) as ProductPageVerificationResult;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function verify(input: ProductPageVerificationInput): Promise<ProductPageVerificationResult> {
  const parsed = productPageVerificationInputSchema.parse(input);
  const verifiedAt = new Date().toISOString();
  const checks: ProductPageVerificationCheck[] = [];

  const source = await productPageSourceService.get(parsed.siteId);

  if (!source) {
    const result: ProductPageVerificationResult = {
      siteId: parsed.siteId,
      domain: null,
      verifiedAt,
      status: "VERIFY_FAILED",
      checks: [
        {
          name: "saved_configuration_exists",
          status: "FAIL",
          expected: true,
          actual: false
        }
      ]
    };
    await saveVerification(result);
    await recordVerificationHistory(result);
    await activationLeadService.updatePublicationStateBySiteId(parsed.siteId, "VERIFY_FAILED");
    return result;
  }

  const expected = productPageGenerationInputSchema.parse(source);
  const expectedDomain = getMasterSiteDomainBySiteId(parsed.siteId) ?? expected.site.domain ?? null;
  const publishingTarget = await getPublishingTarget(parsed.siteId);
  const domain = resolveVerificationHost(expectedDomain, publishingTarget);

  if (!domain) {
    const result: ProductPageVerificationResult = {
      siteId: parsed.siteId,
      domain,
      verifiedAt,
      status: "VERIFY_FAILED",
      checks: [
        {
          name: "site_domain_configured",
          status: "FAIL",
          expected: "public domain",
          actual: null
        }
      ]
    };
    await saveVerification(result);
    await recordVerificationHistory(result);
    await activationLeadService.updatePublicationStateBySiteId(parsed.siteId, "VERIFY_FAILED");
    return result;
  }

  const homepageUrl = `https://${domain}/`;
  const configUrl = `https://${domain}/config.js`;
  const appUrl = `https://${domain}/app.js`;
  const [homepage, configResponse, appResponse] = await Promise.all([
    fetchText(homepageUrl, verifiedAt),
    fetchText(configUrl, verifiedAt),
    fetchText(appUrl, verifiedAt)
  ]);

  checks.push({
    name: "homepage_reachable",
    status: homepage.ok ? "PASS" : "FAIL",
    expected: 200,
    actual: homepage.status,
    message: homepage.error
  });
  checks.push({
    name: "config_reachable",
    status: configResponse.ok ? "PASS" : "FAIL",
    expected: 200,
    actual: configResponse.status,
    message: configResponse.error
  });
  checks.push({
    name: "app_js_reachable",
    status: appResponse.ok ? "PASS" : "FAIL",
    expected: 200,
    actual: appResponse.status,
    message: appResponse.error
  });

  const publicConfig = configResponse.ok ? readConfig(configResponse.body) : null;
  addPresenceCheck(checks, "config_parseable", Boolean(publicConfig), true, Boolean(publicConfig));

  if (publicConfig) {
    addMatchCheck(checks, "site_id_matches", expected.site.id, publicConfig.site?.id);
    addMatchCheck(checks, "site_domain_matches", expectedDomain, publicConfig.site?.domain);
    addMatchCheck(checks, "brand_name_matches", expected.distributor.brandName, publicConfig.distributor?.brandName);
    addMatchCheck(checks, "full_name_matches", expected.distributor.fullName, publicConfig.distributor?.fullName);
    addMatchCheck(
      checks,
      "whatsapp_number_matches",
      expected.distributor.whatsappNumber,
      publicConfig.distributor?.whatsappNumber
    );
    addMatchCheck(
      checks,
      "purchase_url_matches",
      expected.distributor.purchaseUrl,
      publicConfig.distributor?.purchaseUrl
    );
    addMatchCheck(checks, "hero_desktop_matches", expected.hero.desktop, publicConfig.hero?.desktop);
    addMatchCheck(checks, "hero_mobile_matches", expected.hero.mobile, publicConfig.hero?.mobile);
  }

  if (homepage.ok) {
    addPresenceCheck(
      checks,
      "no_static_comprar_fallback",
      !homepage.body.includes('href="#comprar"'),
      "no href=\"#comprar\"",
      homepage.body.includes('href="#comprar"') ? 'href="#comprar"' : "absent"
    );
    addPresenceCheck(
      checks,
      "product_buy_button_present",
      homepage.body.includes("product-btn-buy"),
      ".product-btn-buy",
      homepage.body.includes("product-btn-buy") ? ".product-btn-buy" : "absent"
    );
    addPresenceCheck(
      checks,
      "config_script_present",
      hasVersionedAssetReference(homepage.body, "config.js"),
      '<script src="config.js?v=...">',
      "presence checked"
    );
    addPresenceCheck(
      checks,
      "app_script_present",
      hasVersionedAssetReference(homepage.body, "app.js"),
      '<script src="app.js?v=...">',
      "presence checked"
    );
  }

  if (appResponse.ok) {
    addPresenceCheck(
      checks,
      "app_uses_dynamic_purchase_links",
      appResponse.body.includes("initPurchaseLinks") && appResponse.body.includes("product-btn-buy"),
      "dynamic purchase link handler",
      appResponse.body.includes("initPurchaseLinks") && appResponse.body.includes("product-btn-buy")
        ? "present"
        : "absent"
    );
    addPresenceCheck(
      checks,
      "app_has_no_legacy_purchase_url",
      !appResponse.body.includes("colombia.ganoexcel.com"),
      "no legacy purchase URL",
      appResponse.body.includes("colombia.ganoexcel.com") ? "legacy URL present" : "absent"
    );
  }

  const status = checks.every((check) => check.status === "PASS") ? "VERIFIED" : "VERIFY_FAILED";
  const result: ProductPageVerificationResult = {
    siteId: parsed.siteId,
    domain,
    verifiedAt,
    status,
    checks
  };

  await saveVerification(result);
  await recordVerificationHistory(result);
  await activationLeadService.updatePublicationStateBySiteId(parsed.siteId, status);
  return result;
}

export const productPageVerificationService = { getLastVerification, verify };
