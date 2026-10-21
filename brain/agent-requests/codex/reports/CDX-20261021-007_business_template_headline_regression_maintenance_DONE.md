# CDX-20261021-007 — Business approved headline assertion maintenance

- Owner: Codex Backend Lead; bounded test maintenance, no architecture/product decision.
- Status: implemented and locally verified; controller independent review remains required.
- Branch: `codex/CDX-20261021-007-business-headline-test`.
- Base: `803a965969ab80b11f3d07900c826fb5a8209d12` (reviewed backend/template assembly).
- Change: one literal expected headline in `app/web/server/services/businessMasterContent.integration.test.mjs`, from the retired earnings headline to `Desarrolla una Actividad de Venta Directa con Acompañamiento`.
- Other files changed: own request status and this report. No helper, production, registry, frontend, package, lockfile or real-data changes.

## RED / GREEN

From `app/web`, Node `v24.16.0`, PowerShell:

```powershell
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMasterContent.integration.test.mjs
```

Before correction: exit 1; 1 test, 0 pass, 1 fail. Strict equality at line 57 reported actual `Desarrolla una Actividad de Venta Directa con Acompañamiento`, expected `Construye Libertad Financiera con un Hábito Diario`. This was the intended obsolete assertion, not a generation failure.

After correction: exit 0; 16 tests, 16 pass, 0 fail, 0 skipped. No other content correction was necessary.

## Related regression verification

```powershell
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMasterContent.integration.test.mjs server/services/businessMeasurementGeneration.integration.test.mjs server/services/businessMeasurementAuthority.test.ts server/services/businessMeasurementHtml.test.ts server/services/masterSitesBusinessContentGeneration.integration.test.mjs server/services/businessLandingContentLegacyIngress.test.mjs server/services/productPageSourceBusinessContent.test.ts server/services/productPageGenerationBusinessCta.test.ts server/services/businessVslPoster.test.ts server/services/businessWhatsappCta.test.ts
node ./node_modules/eslint/bin/eslint.js server/services/businessMasterContent.integration.test.mjs --max-warnings=0
```

- Regression run: exit 0; 70 tests, 69 pass, 0 fail, 1 skipped, 0 cancelled/todo.
- Skip: `rejects symlink source paths instead of reading or replacing external files` — Windows symlink privilege unavailable. Directory-junction protection passed.
- Exact-file ESLint: exit 0, no output.
- `git diff --check`: exit 0, no output.
- Existing warnings: Node `ExperimentalWarning` for `--experimental-loader`; `MODULE_TYPELESS_PACKAGE_JSON` for reparsing TypeScript as ES modules. No loader or package changes attempted.
- No aggregate `npm test` script exists. These are the named related integration/regression suites, not a global-suite claim.
- Build: NOT RUN (test-only change); no successful build or release claimed.

## Preservation and self-review

The assertion is independent literal approved copy, checked against both the real generated configuration and saved source. The test still exercises existing fixture approval with the real preparer and real preview authority assembly; no production registry approval was added. Existing assertions for master benefits/methodology/FAQ, VSL and correlated poster, partner site/WhatsApp/CTA, exclusion of master IDs, saved-source regeneration, partner VSL override, Product isolation and fail-before-replacement remain unchanged. Related suites verify profile preservation and measurement authority/policy isolation.

Regression caught: accidental omission/override of approved master headline during real generation or source persistence. Scope review confirms only one test assertion changed, with no weakened policy or runtime behavior.

No provider/network calls, credentials, publication, push, PR, merge or release. Separate integration/release authorization remains required. No implementation follow-up identified; independent review and the existing Windows skip remain visible limitations.

Commit: the commit containing this report (see `git log -1` on this branch); controller scratch report records exact SHA after commit.
