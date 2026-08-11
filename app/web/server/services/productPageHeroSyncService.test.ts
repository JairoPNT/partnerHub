import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  mergeFinalHeroUrls,
  syncProductPageHeroesToLead,
  type FinalHeroUrls
} from "./productPageHeroSyncService.ts";

test("synchronizes both valid final HTTPS heroes exactly once", async () => {
  const calls: Array<{ siteId: string; heroUrls: FinalHeroUrls }> = [];
  const result = await syncProductPageHeroesToLead(
    "claudia-calero",
    {
      desktop: "https://media.partnerhub.club/claudia/desktop.webp",
      mobile: "https://media.partnerhub.club/claudia/mobile.webp"
    },
    {
      async updateHeroUrlsBySiteId(siteId, heroUrls) {
        calls.push({ siteId, heroUrls });
        return { id: "lead-1" };
      }
    }
  );

  assert.deepEqual(result, { status: "synced" });
  assert.deepEqual(calls, [
    {
      siteId: "claudia-calero",
      heroUrls: {
        heroDesktopUrl: "https://media.partnerhub.club/claudia/desktop.webp",
        heroMobileUrl: "https://media.partnerhub.club/claudia/mobile.webp"
      }
    }
  ]);
});

test("synchronizes only the valid hero that is present", async () => {
  let received: FinalHeroUrls | undefined;
  await syncProductPageHeroesToLead(
    "one-hero",
    { desktop: "https://media.partnerhub.club/one/desktop.webp" },
    {
      async updateHeroUrlsBySiteId(_siteId, heroUrls) {
        received = heroUrls;
        return { id: "lead-2" };
      }
    }
  );

  assert.deepEqual(received, {
    heroDesktopUrl: "https://media.partnerhub.club/one/desktop.webp",
    heroMobileUrl: undefined
  });
});

test("does not erase existing heroes or any other onboarding data in a temporary store", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-hero-sync-"));
  const storagePath = resolve(directory, "leads.json");
  const existing = {
    heroDesktopUrl: "https://media.partnerhub.club/existing/desktop.webp",
    heroMobileUrl: "https://media.partnerhub.club/existing/mobile.webp",
    sourcePhotos: ["https://media.partnerhub.club/source.webp"],
    imageUseConsent: true,
    agreementAccepted: true,
    analyticsMeasurementId: "G-EXAMPLE"
  };

  try {
    await writeFile(storagePath, `${JSON.stringify({ onboardingData: existing })}\n`, "utf8");
    const stored = JSON.parse(await readFile(storagePath, "utf8")) as { onboardingData: typeof existing };
    const onboardingData = mergeFinalHeroUrls(stored.onboardingData, {
      heroDesktopUrl: undefined,
      heroMobileUrl: "https://media.partnerhub.club/new/mobile.webp"
    });
    await writeFile(storagePath, `${JSON.stringify({ onboardingData })}\n`, "utf8");
    const updated = JSON.parse(await readFile(storagePath, "utf8")) as { onboardingData: typeof onboardingData };

    assert.deepEqual(updated.onboardingData, {
      ...existing,
      heroMobileUrl: "https://media.partnerhub.club/new/mobile.webp"
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("ignores empty, malformed, and non-HTTPS hero URLs without touching the lead", async () => {
  let updateCalls = 0;
  const result = await syncProductPageHeroesToLead(
    "invalid-heroes",
    { desktop: "", mobile: "http://media.partnerhub.club/mobile.webp" },
    {
      async updateHeroUrlsBySiteId() {
        updateCalls += 1;
        return { id: "lead-3" };
      }
    }
  );

  assert.equal(result.status, "no_valid_heroes");
  assert.match(result.warning ?? "", /No valid HTTPS hero URLs/);
  assert.equal(updateCalls, 0);
});

test("returns a controlled warning when no activation lead is linked", async () => {
  const result = await syncProductPageHeroesToLead(
    "unlinked-site",
    { desktop: "https://media.partnerhub.club/unlinked/desktop.webp" },
    { async updateHeroUrlsBySiteId() { return null; } }
  );

  assert.equal(result.status, "lead_not_found");
  assert.match(result.warning ?? "", /No activation lead is linked/);
});

test("propagates persistence errors and never invokes generation recursively", async () => {
  let updateCalls = 0;
  await assert.rejects(
    syncProductPageHeroesToLead(
      "persistence-error",
      { desktop: "https://media.partnerhub.club/error/desktop.webp" },
      {
        async updateHeroUrlsBySiteId() {
          updateCalls += 1;
          throw new Error("disk unavailable");
        }
      }
    ),
    /disk unavailable/
  );
  assert.equal(updateCalls, 1);
});
