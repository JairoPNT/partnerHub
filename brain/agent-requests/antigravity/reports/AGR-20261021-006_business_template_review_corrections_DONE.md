# AGR-20261021-006 — Business template review corrections

Status: implementation complete; independent controller review required before AGR-003/005. No publication approval.

## Ownership and boundaries

- Request ID: AGR-20261021-006. Assigned Antigravity/frontend owner under explicit delegated execution.
- Branch: `codex/AGR-20261021-006-business-template-review-fixes`.
- Base: `9bb6e794a450508ef1565dfbfa58c8f5863d4621`, incorporating immutable external AGR-001 `bb2f3c7`.
- Commit: the commit containing this report (`git log -1 --format=%H -- brain/agent-requests/antigravity/reports/AGR-20261021-006_business_template_review_corrections_DONE.md`). No push, PR, merge, providers, publication or public-site access.

## Changes

- `plantillas-de-pagina/business/styles.css`: consume approved controller-set desktop/mobile backgrounds at the incumbent 768px breakpoint, with cover/center positioning, persistent dark contrast overlay and opaque no-image fallback.
- `plantillas-de-pagina/business/app.js`: neutral shared hero dedication; validated partner profile retains precedence. Hero no longer inherits the partner-specific FAQ answer.
- `plantillas-de-pagina/business/index.html`: same neutral dedication before JavaScript executes.
- `app/web/scripts/business-paid-traffic-template.test.mjs`: dynamic and static neutral hero regressions, Claudia dedication precedence, unchanged FAQ guard, and real-browser responsive image regression with controlled fixtures.
- This own report. `config.js:159` remains untouched because it is the FAQ answer owned by AGR-003, not the hero fallback after decoupling. No FAQ wording, CTA/VSL copy, runtime/measurement code or backend source changed.

## TDD evidence

From `app/web`, set local browser dependencies, then run the test below:

```powershell
$env:BUSINESS_TEMPLATE_PLAYWRIGHT_MODULE='C:\Users\jairo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright\index.mjs'
$env:BUSINESS_TEMPLATE_BROWSER_CHANNEL='chrome'
node --test scripts/business-paid-traffic-template.test.mjs
```

RED before implementation: 6 tests; 3 pass / 3 fail / 0 skip. Expected failures:

- Generic hero: `shared hero must not inherit a partner-specific weekly dedication from the FAQ`; actual began `Puedes empezar desde 2 horas semanales`.
- Static hero before JavaScript: actual dedication matched `/\b\d+\s*horas/i`.
- Responsive hero: `desktop: actual background must consume selected profile URL; got linear-gradient(rgb(7, 11, 18) 0%, rgb(10, 14, 23) 100%)`.

Initial browser launch before selecting `chrome` was an environment error: the bundled Playwright module had no downloaded Chromium headless-shell executable. Retried using the installed Chrome binary through Playwright `launch({headless:true,channel:'chrome'})`, always fresh temporary contexts, never a user profile. This produced the legitimate RED above.

GREEN after implementation (same environment):

```powershell
node --test scripts/business-paid-traffic-template.test.mjs scripts/business-master-runtime-packaging.test.mjs
```

Output: 7 tests / 7 pass / 0 fail / 0 skip. Includes required disclosure/CTA behavior, Claudia validated profile, malformed profile and rejected host/path regressions. Without Playwright installed or the module variable, only the browser regression explicitly skips; the documented verification used the real browser and did not skip.

## Visual/computed evidence

One batched final screenshot inspection (desktop and mobile); no polish/confirmation loop. All browser requests intercepted: local template files and distinct approved-path image fixtures fulfilled; every other request aborted. No fonts, media, analytics, WhatsApp or remote page fetched. The aborted VSL poster displays its alternative text in captures; VSL container/play affordance remains visible. These fixtures prove responsive rendering, not availability of production assets or VSL playback.

- Desktop 1280x900: actual `backgroundImage` includes `https://media.partnerhub.club/comunes/business/agr006/approved-desktop.webp`, not the mobile URL. The fixture was requested/fulfilled, teal surface visible behind overlay.
- Mobile 390x844: actual `backgroundImage` includes `https://media.partnerhub.club/comunes/business/agr006/approved-mobile.webp`, not the desktop URL. The fixture was requested/fulfilled, distinct burgundy surface visible.
- Both: `backgroundSize="cover, cover"`; opaque `backgroundColor="rgb(10, 14, 23)"`; persistent gradient; notice/VSL visible; `documentElement.scrollWidth <= innerWidth`. Failed-image reload retains opaque surface/gradient. Neutral hero displays no numeric weekly-hour commitment.
- Screenshots (local scratch, not tracked):
  - `C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/sdd/CDX-20261021-004-execution/agr006-browser/agr006-desktop.png`
  - `C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/sdd/CDX-20261021-004-execution/agr006-browser/agr006-mobile.png`
- Impeccable scoped incumbent refinement preserved identity and layout. Context already ran once by controller and was not rerun. `impeccable.cmd detect --target plantillas-de-pagina/business/styles.css` exited 0, reported two incumbent findings: line4 overused-font (Inter), line1056 layout-transition (max-height/padding). Neither changed; no drift repair or upgrade.

## Additional verification and build

- `npm ci --ignore-scripts`: exit0; 312 packages installed; lockfiles/package manifests unchanged. Audit reported 22 vulnerabilities (3 moderate, 18 high, 1 critical); no dependency remediation authorized or attempted.
- `npm run lint`: exit0, ESLint `--max-warnings=0`.
- `npm test`: unavailable (`Missing script: "test"`); repository has individually named suites, no umbrella test command. Not claimed as a passing global suite.
- `npm run test:business-vsl-correlation`: 9/9 pass.
- `npm run test:business-whatsapp-cta`: 7/7 pass.
- `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMasterContent.integration.test.mjs`: 0/1 pass. Known preexisting backend assertion at line45 expects `Construye Libertad Financiera con un Hábito Diario`; actual AGR-001 headline is `Desarrolla una Actividad de Venta Directa con Acompañamiento`. Kept untouched; separate backend handoff required.
- Node backend test warnings: existing experimental-loader and MODULE_TYPELESS_PACKAGE_JSON notices. No package/config changes.
- First `npm run build`: compiled but typecheck failed because `npm ci --ignore-scripts` had not generated PrismaClient.
- Authorized local-only `npm run db:generate`: exit0, Prisma6.19.3 client generated under node_modules; no schema/database access or changes.
- Final `npm run build`: exit0, compiled, TypeScript finished, 39/39 static pages generated. Warnings: multiple-lockfile inferred workspace root; existing Turbopack unexpected NFT trace from next.config.mjs/activationLeadService.ts. No fix attempted outside scope.
- `git diff --check`: exit0. Self-review: only declared files changed; image URL validation unchanged; profile precedence and FAQ answer preserved; neutral text is the existing general sentence with the partner-specific opening removed, not a new time/earnings claim.

## Remaining risks and follow-up

- Independent review required; controller owns integration and next ticket dispatch.
- AGR-003 FAQ and AGR-005 consent remain separate sequential work; no consent/publication readiness implied here.
- Backend stale-headline test and existing dependency/build warnings require separate owners/tickets.
- Browser checks use controlled headless Chrome at two viewports, not physical devices, production imagery/network or live VSL/measurement. No public runtime verification occurred.
