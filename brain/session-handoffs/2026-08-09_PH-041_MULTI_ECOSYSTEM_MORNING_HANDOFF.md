# Session handoff - 2026-08-09 - PH-041 multi-ecosystem masters and routing

## Start here tomorrow

Read:

1. `AGENTS.md`
2. `brain/18_PARALLEL_WORK_AND_TASK_SLICING_POLICY.md`
3. `brain/PH-034_MASTER_SHOWCASE_AND_SUBDOMAIN_ARCHITECTURE.md`
4. `brain/PH-041_MULTI_ECOSYSTEM_GENERATION_AND_PARTNER_ROUTING_PLAN.md`

First executable ticket: `PH-041A - Ecosystem-aware generation service`.

Do not start with UI, SFTP publication, DNS, or partner replication.

## Current production state

- `origin/main` observed at `57ba43f`, merge of PR #95.
- PR #94 delivered the Meta Pixel assignment UI.
- PR #95 delivered Product template Meta custom click events (`WhatsAppClick`, `StoreClick`).
- Product master publication uploads to the correct Product directory and public host.
- The latest Product master publication then reports one failed verification check.
- UI history shows:
  - generated site ID: `ganomaster`;
  - generated source domain: `ganomaster.pro`;
  - published/verified host: `product.ganomaster.pro`;
  - remote root: `/home/u658137804/domains/ganomaster.pro/public_html/product`.
- Likely failure: `site_domain_matches`, because the master UI still hardcodes `site.domain = ganomaster.pro` while the verifier correctly expects `product.ganomaster.pro` for `ganomaster`.

## Immediate read-only confirmation

In `/master-sites`, expand `Detalle de verificaciones fallidas (1)` for the latest Product publication and record:

- check name;
- expected value;
- actual value.

Expected evidence:

- name: `site_domain_matches`;
- expected: `product.ganomaster.pro`;
- actual: `ganomaster.pro`.

If the evidence differs, update PH-041A diagnosis before editing code.

## Confirmed architecture

Masters:

- `ganomaster.pro`: showcase only.
- `product.ganomaster.pro`: Product master.
- `business.ganomaster.pro`: Business master.
- `brand.ganomaster.pro`: Personal Brand master.

Partners with one ecosystem:

- The purchased ecosystem is served at the root domain, e.g. `claudiacalero.pro`.

Partners with all three ecosystems:

- Personal Brand: root domain.
- Product: `producto.<domain>`.
- Business: `negocio.<domain>`.

Exactly two ecosystems remain an explicit product decision. Recommended rule is documented in PH-041 but is not approved.

## Ticket boundaries

- PH-041A: backend generation selection and tests only.
- AGR-20260810-001: frontend master administration payload/copy only, after PH-041A.
- PH-041B: partner hostname/target policy only, after the two-ecosystem decision.
- PH-041C: one-at-a-time production master publication.
- PH-041D: one approved partner pilot.

## Existing unrelated work

- AGR-20260809-002 mobile navigation request was created earlier; confirm its implementation/report status before scheduling new work on `app-shell.tsx`, `sidebar.tsx`, or `topbar.tsx`.
- PH-040A1 Pixel removal remains pending.
- PH-040B public Meta Pixel verification remains pending.
- Do not absorb those tickets into PH-041.

## Definition of tomorrow's first success

PH-041A is complete when tests prove the generator selects the correct canonical directory and generated master for PRODUCT, BUSINESS, and PERSONAL_BRAND, rejects cross-ecosystem selection, and passes targeted lint/build without any provider or production operation.
