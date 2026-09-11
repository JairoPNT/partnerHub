import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const webRoot = resolve(import.meta.dirname, "..");

test("Docker packages the complete Personal Brand template and its read-only maintenance commands", async () => {
  const dockerfile = await readFile(join(root, "Dockerfile"), "utf8");
  const packageJson = JSON.parse(await readFile(join(webRoot, "package.json"), "utf8"));
  const runner = dockerfile.split(/FROM node:20-alpine AS runner\r?\n/, 2)[1];

  assert.match(dockerfile, /COPY plantillas-de-pagina\/personal-brand \.\/plantillas-de-pagina\/personal-brand/);
  assert.ok(runner, "runner stage must exist");
  assert.match(runner, /COPY --from=builder \/repo\/plantillas-de-pagina\/personal-brand \.\/plantillas-de-pagina\/personal-brand/);
  assert.match(runner, /COPY --from=builder \/repo\/app\/web\/scripts\/jairo-personal-brand-master-package\.mjs \.\/scripts\/jairo-personal-brand-master-package\.mjs/);
  assert.match(runner, /COPY --from=builder \/repo\/app\/web\/scripts\/prepare-jairo-personal-brand-publication-preview\.mjs \.\/scripts\/prepare-jairo-personal-brand-publication-preview\.mjs/);
  assert.equal(packageJson.scripts["maintenance:jairo-personal-brand-master-package"], "node scripts/jairo-personal-brand-master-package.mjs");
  assert.equal(packageJson.scripts["maintenance:jairo-personal-brand-publication-preview"], "node scripts/prepare-jairo-personal-brand-publication-preview.mjs");
});
