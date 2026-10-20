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
