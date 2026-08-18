import assert from "node:assert/strict";
import test from "node:test";

import { moduleNavigation } from "../modules/catalog.ts";

test("moduleNavigation defines all 12 modules with valid routes and groups", () => {
  assert.equal(moduleNavigation.length, 12, "Must contain all 12 system modules");

  const allowedGroups = new Set(["Core", "Operations", "Growth"]);
  const expectedSlugs = [
    "/dashboard",
    "/partners",
    "/plans",
    "/payments",
    "/master-site",
    "/landing-builder",
    "/creative-assets",
    "/analytics",
    "/campaigns",
    "/automations",
    "/domains",
    "/settings"
  ];

  for (const item of moduleNavigation) {
    assert.ok(item.href.startsWith("/"), `Route ${item.href} must be absolute path`);
    assert.ok(allowedGroups.has(item.group), `Group ${item.group} must be valid`);
    assert.ok(item.name.length > 0, `Module ${item.href} must have a name`);
    assert.ok(item.description.length > 0, `Module ${item.href} must have a description`);
  }

  const hrefs = moduleNavigation.map((m) => m.href);
  for (const slug of expectedSlugs) {
    assert.ok(hrefs.includes(slug), `Missing module route: ${slug}`);
  }
});

test("navigation groups cover Core, Operations, and Growth without orphan items", () => {
  const groups = new Set(moduleNavigation.map((m) => m.group));
  assert.equal(groups.has("Core"), true);
  assert.equal(groups.has("Operations"), true);
  assert.equal(groups.has("Growth"), true);
});
