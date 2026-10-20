# CDX-20261020-003 — DONE (integration pending)

Owner: Codex Backend Lead. Branch: `codex/CDX-20261020-003-business-master-content`.
Base: `38fef7ea757baf66492426946c3f5e387c0375b2` (PR #209).

## Result

Business generation loads the selected operator-managed local master `config.js`, verifies the fixed Business master identity and required presentation shape, and selects presentation fields only. Rich hero, benefits, comparison, methodology, FAQ, social proof, testimonials, legal content and default VSL survive generation and regeneration. Partner site/contact, guarded WhatsApp CTAs and analytics remain authoritative. Existing Product poster correlation runs after composition. Product generation remains unchanged.

Read/validation occurs before deleting an existing generated package. Local script evaluation uses an isolated context, disabled dynamic code generation, JSON transfer and a 100ms execution timeout. This is for trusted operator-managed template files, not a security boundary for uploaded/untrusted JavaScript.

Files: `app/web/server/services/productPageGenerationService.ts`, `businessMasterContent.ts`, `businessMasterContent.integration.test.mjs`, this report and matching request. No providers, persistent production storage, UI, environment, templates or publication jobs changed.

## Verification

From `app/web`:

```sh
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMasterContent.integration.test.mjs server/services/productPageGenerationBusinessCta.test.ts server/services/businessVslPoster.test.ts server/services/businessWhatsappCta.test.ts
npx eslint server/services/businessMasterContent.ts server/services/productPageGenerationService.ts server/services/businessMasterContent.integration.test.mjs --max-warnings=0
git diff --check
```

RED: new integration test failed on `benefits[0].title`, actual undefined, expected `Socio Comercial Sólido`. GREEN: 17/17 pass; scoped lint and whitespace checks pass. Tests use real generation, source persistence and regeneration; only entitlement/store side effects and poster lookup are replaced in the fixture. Node emits the repository's existing experimental loader/module-type warnings.

`npx tsc --noEmit --pretty false` fails on preexisting repository test typing errors (TS5097 imports, WompiReturnContext casts, ProcessEnv NODE_ENV fixtures, Business readiness readonly fixtures, Business poster vsl typing). No diagnostics point to changed production files. Full build belongs to integration owner and has not been claimed here. No generic `npm test` script is defined; focused commands are explicit.

## Integration and risks

Cherry-pick this ticket commit alongside CDX-20261020-004, independently review and run the final integrated build. No push, PR, merge or deploy performed by this task. Production still needs deployment and authorized generation/publication for Claudia.

Separate preexisting issue observed: when input omits both metadata descriptions the normalizer persists empty strings, while saved-source parsing requires nonempty optional descriptions; regeneration then fails validation. The integration fixture supplies valid partner metadata. This ticket does not broaden into metadata validation changes.

## Independent review follow-up

Both P2 findings reproduced before the correction: seven new sentinel-preservation cases failed with `Missing expected rejection` for inherited empty VSL caption, unsupported provider/aspect ratio, string autoplay, string comparison list, empty methodology item and empty FAQ item. The generator accepted those malformed masters and would replace the existing package.

The helper now validates inherited VSL fields against the generation input contract, including enums, nonempty optional text and boolean autoplay. Master theme presets likewise remain compatible with saved-source parsing. Comparison lists contain strings, methodology items require title/description, FAQ items require question/answer, and optional social-proof/testimonial collections validate their renderer-consumed structure. Validation still precedes output removal. The test explicitly parses the regenerated configuration with the real input schema.

The exact focused command above now passes **24/24 tests**; scoped ESLint and `git diff --check` pass. Full integration build remains assigned to the orchestrator. No production/provider actions or expansion into the preexisting metadata issue.

### Final integration review: inherited hero URLs

On integration branch `codex/CDX-20261020-005-claudia-business-generation-integration`, base `0e4b923`, reproduced both inherited HTTP desktop/mobile hero cases RED (`Missing expected rejection`). Both values are persisted into fields validated as HTTPS by saved-source parsing. They now receive HTTPS URL validation when loading the master, before existing output removal. Other inherited passthrough fields are presentation-only: the saved-source input schema strips them; VSL and theme already use compatible explicit schemas.

GREEN: **26/26** on the same four-file focused command above. Focused ESLint and `git diff --check` pass. Sentinel checks confirm the existing package survives either invalid inherited hero URL.
