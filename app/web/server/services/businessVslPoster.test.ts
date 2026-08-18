import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBusinessVslPoster,
  INTERNAL_VSL_POSTER_PLACEHOLDER,
  resolveBusinessVslThumbnail
} from "./businessVslPoster.ts";

test("uses the partner Product desktop hero as the generated Business VSL thumbnail", () => {
  const heroDesktopUrl = "https://media.partnerhub.club/partners/ana/product-hero-desktop.webp";
  const generated = applyBusinessVslPoster({
    ecosystemType: "BUSINESS",
    hero: {
      desktop: heroDesktopUrl,
      mobile: "https://media.partnerhub.club/partners/ana/product-hero-mobile.webp"
    },
    vsl: { provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/example" }
  }, true);

  assert.equal(generated.vsl?.thumbnailUrl, heroDesktopUrl);
  assert.equal(generated.hero.desktop, heroDesktopUrl);
  assert.equal(generated.vsl?.embedUrl, "https://www.youtube-nocookie.com/embed/example");
});

test("falls back from desktop to mobile and then to the internal placeholder", () => {
  const heroMobileUrl = "https://media.partnerhub.club/partners/ana/product-hero-mobile.webp";
  assert.equal(resolveBusinessVslThumbnail({ mobile: heroMobileUrl }), heroMobileUrl);
  assert.equal(resolveBusinessVslThumbnail({}), INTERNAL_VSL_POSTER_PLACEHOLDER);
});

test("does not add a VSL poster to Product or Personal Brand configurations", () => {
  for (const ecosystemType of ["PRODUCT", "PERSONAL_BRAND"] as const) {
    const configuration = {
      ecosystemType,
      hero: { desktop: "https://media.partnerhub.club/partners/ana/product-hero-desktop.webp" }
    };
    assert.equal(applyBusinessVslPoster(configuration, true), configuration);
    assert.equal("vsl" in configuration, false);
  }
});

test("overrides a legacy Business thumbnail without changing other legacy VSL fields", () => {
  const generated = applyBusinessVslPoster({
    ecosystemType: "BUSINESS",
    hero: { desktop: "https://media.partnerhub.club/partners/ana/current-desktop.webp" },
    vsl: { thumbnailUrl: "https://legacy.example/poster.webp", autoPlay: true, durationText: "10 min" }
  }, true);

  assert.equal(generated.vsl?.thumbnailUrl, "https://media.partnerhub.club/partners/ana/current-desktop.webp");
  assert.equal(generated.vsl?.autoPlay, true);
  assert.equal(generated.vsl?.durationText, "10 min");
});

test("does not alter the canonical Business master configuration", () => {
  const configuration = {
    ecosystemType: "BUSINESS" as const,
    hero: { desktop: "https://media.partnerhub.club/masters/business-desktop.webp" },
    vsl: { thumbnailUrl: "https://media.partnerhub.club/masters/business-vsl.webp" }
  };
  assert.equal(applyBusinessVslPoster(configuration, false), configuration);
  assert.equal(configuration.vsl.thumbnailUrl, "https://media.partnerhub.club/masters/business-vsl.webp");
});
