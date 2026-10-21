# CDX-20261021-002 — Business consent and analytics audit

Date: 2026-10-21. Owner: Codex Backend Lead. Status: repository audit complete; **consent validation blocked**. This is not a legal certification or a production-readiness approval.

## Scope and method

Audited source baseline `d74b2fb9872adf1a53dc2c2f2402d3cd1f92538b` (assigned origin/main baseline) in isolated branch `codex/CDX-20261021-002-business-consent-audit`. Read configuration, generation, canonical Business HTML/JS/CSS, managed Meta injection and relevant local tests. No source/runtime changes, generated sites, live account inspection, publication, provider calls, secrets or partner data were used. Fixture IDs only; no actual tracking IDs are reproduced.

This audit checked a historical claim, present in the design version read at audit start, that Business fires `click_cta` and `WhatsAppClick`; it is **not corroborated by this baseline's canonical template**. The specification has since been corrected; this finding does not describe an error in its current version. Historical reports are not runtime evidence. Analytics and Metrics remains monitoring-only for already-active campaigns; this audit does not operate campaigns.

## Configuration → generated HTML → browser

All references below are repository-relative and refer to the audited baseline.

| Stage | Evidence | Result |
| --- | --- | --- |
| Site source | `app/web/server/services/productPageSourceService.ts:15`, `:42`, `:62` | Source document is saved/read locally under the configured source directory; its runtime contents were not inspected. |
| Master Sites input | `app/web/server/services/masterSitesBusinessInput.ts:32`, `:37`, `:41`, `:90` | Explicit onboarding measurement fields take precedence when defined, otherwise saved source is used. Nonempty values become GA4/Meta/Ads configuration. Empty values omit those integrations. No consent is acquired here. |
| Input validation | `app/web/server/services/productPageGenerationService.ts:43`, `:148`, `:153` | GA4 accepts a G-format measurement ID; Meta accepts 5–32 digits; Ads accepts a nonempty conversion ID. These are configuration checks, not evidence of measurement or consent. |
| Effective config | `app/web/server/services/productPageGenerationService.ts:276`, `:317`, `:333` | Top-level GA4 measurement ID takes precedence over its integration alias; integrations remain in config. JSON is serialized into `config.js` and assigned to `window.CONFIG`. No GA4 loader is added here. |
| Presentation isolation | `app/web/server/services/businessMasterContent.ts:13`, `:56`, `:74` | Master config is parsed through a presentation allowlist; master analytics/contacts are not inherited as presentation. Partner configuration overrides presentation. This does not sanitize the copied master HTML/JS. |
| Template choice | `app/web/server/services/productPageGenerationService.ts:235`; `app/web/server/services/ecosystemTemplateResolver.ts:6`, `:18` | Master sites default to canonical Business; partners default to the generated `ganomaster-business` directory. An explicit canonical option also exists. Runtime master contents are unknown in this repository-only audit. |
| Static package | `app/web/server/services/productPageGenerationService.ts:199`, `:381`, `:396`, `:413`, `:415` | Generator copies selected HTML/app/styles, writes effective config, injects managed Meta, then versions asset references. We did not call `generate`, which writes output/source/history. |
| HTML integration | `app/web/server/services/productPageGenerationService.ts:348`, `:354`; `app/web/server/services/metaPixelHtml.ts:47` | Only Meta is injected by this integration step. Missing Pixel removes only PartnerHub-managed blocks; invalid ID or missing insertion tags fails. Arbitrary unmanaged tags already in a runtime master are not removed. |
| Browser startup | `plantillas-de-pagina/business/index.html:389`; `plantillas-de-pagina/business/app.js:556` | Canonical HTML loads config then app at the body end. App waits for DOMContentLoaded to apply theme/render content. Injected Meta executes earlier, in head. |

## Consent source and load order

**No consent-acquisition point, consent state, acceptance/rejection handler, persistence, withdrawal path or tracker gate was found in canonical Business.** Searching the complete Business tree for consent/cookie/storage/tag/event markers and inspecting its startup, CTA and modal paths found only privacy/terms presentation, not a consent contract.

- Privacy and terms buttons only open/close modals (`plantillas-de-pagina/business/app.js:502`, `:524`, `:539`); startup invokes them through rendering (`:398`, `:556`). A privacy notice is not a measurement opt-in.
- Meta's injected inline script creates an async `fbevents.js` loader (`app/web/server/services/metaPixelHtml.ts:24`), calls `fbq('init', ...)` and `fbq('track', 'PageView')` (`:32`, `:33`). It is inserted immediately before closing head (`:59`), before canonical config/app and any modal interaction. There is no consent condition or revoke/grant command in this block.
- With a configured valid Pixel, Meta loading and PageView queuing are unconditional in this source, regardless of missing/rejected consent. An offline VM probe with absent and synthetic `denied` state confirmed the same loader insertion and queue. This does not claim a real rejection UI exists.
- GA4: `plantillas-de-pagina/business/config.js:200` declares an optional ID but the entire canonical app/index has no GA4 loader, `gtag`, `dataLayer`, or GA4 event calls. The generator only serializes its ID. A configured ID therefore does **not** establish Business GA4 PageView/events. Without ID, no GA4 load is introduced by these paths either.
- Google Ads configuration is likewise not proof of a loader or conversion. No Ads event is introduced by the reviewed Business runtime/integration path.

The guard `if (f.fbq) return` avoids recreating an existing loader, not the subsequent init/PageView calls. Managed-block idempotence does not prove PageView is unique when a runtime master contains unmanaged scripts.

## Event names, CTA meaning and PII

| Signal | Actual repository behavior | Meaning / limits |
| --- | --- | --- |
| Meta `PageView` | Explicit queued `fbq('track', 'PageView')` with no custom parameter object (`metaPixelHtml.ts:33`); alternate noscript image (`:38`). | Page request/view signal, not contact, registration, purchase or sale. Provider delivery and reporting not tested. |
| GA4 PageView | No canonical Business loader or event implementation found. | Absent in audited canonical path; live/custom master behavior unknown. |
| `click_cta` / `WhatsAppClick` | Neither event name nor a GA4/Meta CTA listener exists in canonical Business; CTA code only binds URLs/text/target/rel (`plantillas-de-pagina/business/app.js:169`–`:213`). | Do not report these as received or preserved events. A WhatsApp navigation is intent only, never a completed conversation or commercial outcome. |
| Registration / purchase / Ads conversion | No corresponding analytics emission in reviewed path. | No confirmed conversion signal; CTA naming cannot establish one. |

Business backend deliberately derives both CTA destinations from validated WhatsApp identity and clears direct registration (`app/web/server/services/businessWhatsappCta.ts:24`, `:36`, `:47`; normalizer call at `productPageGenerationService.ts:282`). Canonical app binds those effective URLs; absent number in standalone config falls back to an HTTP-looking custom URL or `#contacto` (`app.js:170`–`:174`). This browser fallback is not the server-validated generated contract.

The WhatsApp destination contains partner number and encoded default message, intentionally used for navigation. The serialized public config also contains distributor identity (`productPageGenerationService.ts:298`, `:333`). **Do not reuse config, link href, phone, name or message as analytics parameters.** No custom event payload transmits them in reviewed code because no CTA analytics emission exists. The base Meta init/PageView code passes only Pixel ID/event name, and the noscript URL contains Pixel ID, event and noscript flag. This is not a guarantee that external SDK automatic collection, browser URL/referrer, query parameters, cookies or third-party configuration are PII-free; those are unverified. Never mark “no PII in analytics” validated solely from the lack of a custom payload.

The privacy notice claims collection is voluntary through contact (`plantillas-de-pagina/business/index.html:350`; `config.js:195`), but does not explain the unconditional Meta request. `privacyPolicyText`/`termsText` in config are not consumed by canonical app; modal text is static HTML. Content accuracy and consent enforcement need separate follow-up owners.

## Missing/rejected consent and no JavaScript

- Configured Pixel + JavaScript: attempts SDK load and queues PageView before interaction, even absent/rejected consent; no rejection/withdrawal UI was found.
- Configured Pixel + JavaScript disabled: generated body includes a `noscript` image request to Meta with `ev=PageView` (`metaPixelHtml.ts:38`–`:43`, `:61`); there is no consent gate. Actual delivery still depends on browser/network policy. Disabling JS is not a privacy gate here.
- Missing Pixel: removes inherited managed blocks (`metaPixelHtml.ts:17`, `:48`), but cannot establish a tracker-free package if unmanaged code exists in selected master.
- No JavaScript: canonical CTA hrefs remain `#contacto` or `#` (`plantillas-de-pagina/business/index.html:39`, `:145`, `:152`, `:286`, `:293`); config binding does not occur. Privacy button cannot open its hidden modal (`styles.css:1240`, `:1258`; `app.js:524`). No CTA events or canonical GA4 execute. The video click handler also cannot create its player (`app.js:430`).

## Verification evidence

Executed locally with Node `v24.16.0`, npm `11.13.0`:

- `npm run test:meta-pixel` from `app/web`: **5/5 pass, 0 fail**. Covers head/body placement, managed-block replacement/removal, malformed ID rejection and missing tags (`metaPixelHtml.test.ts:8`, `:17`, `:27`, `:34`, `:39`). It positively asserts unconditional PageView/noscript markup, not consent behavior.
- `npm run test:business-whatsapp-cta`: first attempt had 3 passing helper cases and a module-load failure (`ERR_MODULE_NOT_FOUND: zod`) before normalizer cases. After isolated `npm ci --ignore-scripts --no-audit --no-fund` (312 packages), rerun **5/5 pass, 0 fail**. No manifest/lockfile changes. Covers safe destination derivation, ignoring arbitrary URLs, invalid identity, Business normalizer and Product isolation (`businessWhatsappCta.test.ts:6`, `:27`, `:47`; `productPageGenerationBusinessCta.test.ts:37`, `:54`). It does not click DOM or test analytics.
- Offline in-memory Node/VM assertions: **pass**. Applied the real injector to canonical HTML using a synthetic Pixel; verified head execution precedes config, exactly one SDK node insertion and PageView queue for absent and synthetic denied state, noscript image presence, and retention of an unmanaged fixture script. No SDK fetched or provider contacted; not a browser consent/receipt test.
- Node emitted existing module-type and experimental-loader warnings. They were not hidden; no product changes were made to suppress them.
- `git diff --check` and scoped staged-diff review performed before commit. Only this request and report are committed; private execution notes stay ignored under `.local-secrets/sdd/CDX-20261021-002/task-1-report.md`.
- Build: **not run** (documentation-only audit; no runtime change). Full application tests, browser E2E and generated-site/public validation were not run or claimed.

Missing regression coverage: pre-consent/no-consent/reject blocking; accept-once/reload/withdrawal behavior; no-JS tracking policy; effective GA4 loader and ID precedence at runtime; CTA event names/semantics/deduplication; PII-safe parameter allowlist including URL/referrer risks; unmanaged master tags; browser delivery and consent persistence; no-JS CTA/privacy fallback.

## Decision and smallest corrective follow-up

**Block any claim of “consentimiento validado”, GA4/WhatsApp event reception or paid-traffic readiness based on this source alone.** The repository audit is complete; remediation is not implemented.

Propose a new separately approved request: **Business managed Meta consent enforcement**. Codex owns the bounded generator/managed-tag policy; architecture/product must first approve required consent categories, default-deny behavior, withdrawal and the no-JS policy. Antigravity must own any separate consent UX request; do not silently modify frontend here. Preserve configured IDs, gate SDK/init/PageView until approved consent, ensure noscript cannot bypass the selected policy, and test denied/absent/accepted/reloaded/withdrawn branches and deduplication using fixtures. Because `metaPixelHtml.ts` is shared, explicitly declare other-ecosystem regression boundaries or scope enforcement to Business rather than changing every ecosystem implicitly. Claude reviews security/privacy before integration. No external account changes or publication are included.

GA4 loader restoration and CTA instrumentation require their own decision/ticket after the consent/event contract is approved: verify whether these features are intended in Business rather than inventing names from historical reports. Any approved WhatsApp event must mean click/intention only, use a minimal non-PII allowlist and never send href/message/contact identity. A separate frontend notice/no-JS request can resolve disclosure and fallback gaps. Live generated-master/package and authorized public verification are later gates, not this audit's deliverable.

## Delivery and review

Changed: this DONE report and `brain/agent-requests/codex/requests/CDX-20261021-002_business_consent_analytics_audit.md` completion metadata. No product, API contract, migration, infrastructure or generated output changed. Safe alongside CDX-001 and AGR-001/002; these findings are a read-only handoff, not a new integration contract.

Branch: `codex/CDX-20261021-002-business-consent-audit`. Commit: this request/report commit (resolve with `git log -1 -- brain/agent-requests/codex/reports/CDX-20261021-002_business_consent_analytics_audit_DONE.md`). No push/PR/merge. Self-review only, as assigned; independent review remains a controller gate. Follow-up required: **yes**. Live deployment/master contents, actual IDs, consent applicability and provider receipt remain unknown.
