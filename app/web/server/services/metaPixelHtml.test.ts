import assert from "node:assert/strict";
import test from "node:test";

import { applyMetaPixelToHtml } from "./metaPixelHtml.ts";

const template = "<!doctype html><html><head><title>Test</title></head><body class=\"page\"><main>Page</main></body></html>";

test("injects the configured Meta Pixel into head and body exactly once", () => {
  const html = applyMetaPixelToHtml(template, "123456789012345");

  assert.match(html, /<head>[\s\S]*connect\.facebook\.net[\s\S]*fbq\('init', '123456789012345'\)[\s\S]*fbq\('track', 'PageView'\)[\s\S]*<\/head>/);
  assert.match(html, /<body class="page">[\s\S]*facebook\.com\/tr\?id=123456789012345&ev=PageView&noscript=1[\s\S]*<\/body>/);
  assert.equal(html.match(/PartnerHub Meta Pixel: head:start/g)?.length, 1);
  assert.equal(html.match(/PartnerHub Meta Pixel: body:start/g)?.length, 1);
});

test("replaces an inherited Pixel without duplicating managed blocks", () => {
  const masterHtml = applyMetaPixelToHtml(template, "111111111111111");
  const partnerHtml = applyMetaPixelToHtml(masterHtml, "222222222222222");

  assert.doesNotMatch(partnerHtml, /111111111111111/);
  assert.match(partnerHtml, /222222222222222/);
  assert.equal(partnerHtml.match(/PartnerHub Meta Pixel: head:start/g)?.length, 1);
  assert.equal(partnerHtml.match(/PartnerHub Meta Pixel: body:start/g)?.length, 1);
});

test("removes an inherited managed Pixel when the partner has no Pixel", () => {
  const masterHtml = applyMetaPixelToHtml(template, "111111111111111");
  const partnerHtml = applyMetaPixelToHtml(masterHtml);

  assert.doesNotMatch(partnerHtml, /111111111111111|PartnerHub Meta Pixel|fbevents\.js/);
});

test("rejects executable or malformed Pixel IDs", () => {
  assert.throws(() => applyMetaPixelToHtml(template, "123';alert(1)//"), /between 5 and 32 digits/);
  assert.throws(() => applyMetaPixelToHtml(template, "1234"), /between 5 and 32 digits/);
});

test("fails safely when the template cannot receive both managed blocks", () => {
  assert.throws(
    () => applyMetaPixelToHtml("<html><head></head></html>", "1234567890"),
    /closing head and opening body/
  );
});
