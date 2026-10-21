# AGR-20261021-003 — Business FAQ weekly dedication

Status: implementation complete; pending independent review and controller integration. Not published.

## Ownership and scope

- Request ID: AGR-20261021-003. Assigned Antigravity/frontend owner under explicit delegated execution.
- Branch: `codex/AGR-20261021-003-business-faq-dedication`.
- Exact base HEAD: `47b84d5f13461dd04fe99286262f1a7da1c6e8c8`, after reviewed AGR-001/006. Working tree was clean.
- Commit: the commit containing this report (`git log -1 --format=%H -- brain/agent-requests/antigravity/reports/AGR-20261021-003_business_faq_weekly_dedication_DONE.md`). No push, PR or merge.

## Changes

- `plantillas-de-pagina/business/config.js`: only FAQ `f2.answer` changed to Jairo's exact approved text: minimum 2 hours/week, optional recommended 8–12 hours for training/commercial activity, objectives-dependent dedication and no guaranteed results. Length 251, within existing 300-character validation limit.
- `app/web/scripts/business-paid-traffic-template.test.mjs`: update generic-default expectation and add rendered-FAQ regression for missing/empty profile and explicit valid dedication override. Checks all three other answers unchanged and neutral hero fallback/profile precedence.
- This own report updates operational memory for the ticket.

No changes to `app.js`, `index.html`, CSS, other FAQs, CTA/video/consent/measurement/runtime, backend, contracts, manifests, generated files, providers, saved partner/master sources or publication. Self-review parsed before/after config and proved they are deeply equal after substituting only `faq.items[1].answer`; diff contains one production line.

## Verification

TDD RED before changing config:

```powershell
node --test --test-name-pattern='weekly dedication FAQ|safe generic defaults' scripts/business-paid-traffic-template.test.mjs
```

Result: 2/2 failed as expected, old answer beginning `Puedes empezar desde 2 horas semanales` instead of approved new answer. Failure was assertion mismatch, not a loader/environment error.

GREEN from `app/web`:

```powershell
$env:BUSINESS_TEMPLATE_PLAYWRIGHT_MODULE='C:/Users/jairo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:BUSINESS_TEMPLATE_BROWSER_CHANNEL='chrome'
node --test scripts/business-paid-traffic-template.test.mjs scripts/business-master-runtime-packaging.test.mjs
```

Result: 8/8 pass, 0 fail, 0 skip (includes one nested static-hero subtest). Existing browser regression uses controlled local responses and aborts all other requests; no external source/publication access. Desktop/mobile hero backgrounds and neutral dedication, disclosure/VSL visibility and overflow checks remain passing. No new screenshots required for the literal-only FAQ change. Earlier run without module variable: 6 pass, 1 expected browser skip; final run above removed the skip.

- `npm run test:business-vsl-correlation`: 9/9 pass.
- `npm run test:business-whatsapp-cta`: 7/7 pass.
- `npm run lint`: exit 0, ESLint with zero warnings.
- `node --check` on canonical config/app and changed test: exit 0 each.
- `git diff --check`: exit 0.
- `npm test`: unavailable (`Missing script: "test"`); no umbrella suite exists. Not claimed as a passing global suite.
- Existing Node MODULE_TYPELESS_PACKAGE_JSON and experimental-loader notices occurred in backend regression commands; no out-of-scope configuration change.

## Build status

Full Next application build not rerun: this ticket changes a standalone template literal and its Node test, no app build inputs. Template syntax checks, production packaging regression, rendered template tests, CTA/VSL suites and lint passed. No claim of a fresh full-app build.

## Skills and remaining follow-up

TDD governed RED/GREEN. Impeccable clarify/craft-floor preserved incumbent copy/layout outside the approved literal and did not introduce claims or a redesign; controller had already loaded context once, so it was not rerun.

Independent review and integration remain controller-owned. Claudia's saved profile may retain the earlier dedication and intentionally continues to override the template; updating it requires the separate authorized source flow. No real profile/source was changed. No implementation gap in this request; no publication authorization implied. Existing backend stale-headline test/dependency findings documented by AGR-006 are outside this ticket and were not changed.
