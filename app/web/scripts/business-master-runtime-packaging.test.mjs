import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "../../..");

test("production runtime packages the Business refresh entrypoint, canonical template and npm commands", async () => {
  const [dockerfile, packageBytes] = await Promise.all([
    readFile(resolve(ROOT, "Dockerfile"), "utf8"),
    readFile(resolve(ROOT, "app/web/package.json"), "utf8")
  ]);
  const packageJson = JSON.parse(packageBytes);

  assert.ok(dockerfile.includes("COPY plantillas-de-pagina/business ./plantillas-de-pagina/business"));
  assert.ok(dockerfile.includes("COPY --from=builder /repo/app/web/scripts/jairo-business-master-package-drift-recovery.mjs ./scripts/jairo-business-master-package-drift-recovery.mjs"));
  assert.equal(packageJson.scripts["maintenance:jairo-business-master-package-drift-recovery"], "node scripts/jairo-business-master-package-drift-recovery.mjs");
  assert.equal(packageJson.scripts["test:jairo-business-master-package-drift-recovery"], "node --test scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/business-master-runtime-packaging.test.mjs");
});
