import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const web = resolve(import.meta.dirname, "..");
// Resolve at the real application and Next optimizer boundaries, not this test's directory.
const uploadRequire = createRequire(resolve(web, "server/services/mediaUploadService.ts"));
const nextRequire = createRequire(uploadRequire.resolve("next/dist/server/image-optimizer"));
const boundaries = [["media upload", uploadRequire], ["Next image optimizer", nextRequire]];

function assertMinimum(actual, minimum, name) {
  assert.match(actual ?? "", /^\d+\.\d+\.\d+$/, `${name} must expose a release version`);
  const parts = actual.split(".").map(Number), floor = minimum.split(".").map(Number);
  const difference = parts.map((part, i) => part - floor[i]).find((part) => part !== 0) ?? 0;
  assert.ok(difference >= 0, `${name} ${actual} is below corrected floor ${minimum}`);
}

for (const [name, requireAtBoundary] of boundaries) {
  test(`${name} resolves corrected native image decoders rather than a hidden affected copy`, (t) => {
    // Different historical libvips DLLs cannot safely share a Windows process.
    const result = spawnSync(process.execPath, ["-e", `const sharp = require(${JSON.stringify(requireAtBoundary.resolve("sharp"))}); console.log(JSON.stringify(sharp.versions));`], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    const versions = JSON.parse(result.stdout);
    t.diagnostic(JSON.stringify({ boundary: name, resolved: requireAtBoundary.resolve("sharp"), versions }));
    // Vendor advisories GHSA-rgj7-g3m4-5g8c / GHSA-wq5f-xc86-pv6w,
    // plus sharp 0.35.5's published minimum libvips build.
    assertMinimum(versions.sharp, "0.35.5", `${name} sharp`);
    assertMinimum(versions.vips, "8.18.7", `${name} libvips`);
    assertMinimum(versions.heif, "1.23.2", `${name} libheif`);
    if (versions.rsvg) assertMinimum(versions.rsvg, "2.63.2", `${name} librsvg`);
  });

  test(`${name} native packaging decodes image bytes and produces resized WebP`, () => {
    // Benign, independently encoded 1x1 PNG; no filesystem, provider or network calls.
    const result = spawnSync(process.execPath, ["-e", `
      const sharp = require(${JSON.stringify(requireAtBoundary.resolve("sharp"))});
      (async () => {
        const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
        const { data, info } = await sharp(png).rotate().resize(2, 2).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
        const decoded = await sharp(data).raw().toBuffer({ resolveWithObject: true });
        console.log(JSON.stringify({ info, decoded: decoded.info, byteLength: decoded.data.byteLength }));
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `], { encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    const { info, decoded, byteLength } = JSON.parse(result.stdout);
    assert.equal(info.format, "webp");
    assert.equal(info.width, 2);
    assert.equal(info.height, 2);
    assert.equal(decoded.width, 2);
    assert.equal(decoded.height, 2);
    assert.ok(byteLength > 0);
  });
}
