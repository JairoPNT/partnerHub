# AGR-20260810-001 - Master Sites ecosystem contract

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- PH-041A is merged through PR #96.
- The backend generator now selects the canonical template and generated master from `ecosystemType` and rejects cross-ecosystem masters.
- PH-034 remains the canonical master-domain architecture.

## Single outcome

Make `/master-sites` generate, display, preview, publish, and verify the canonical identity of the active ecosystem instead of reusing the legacy Product/root-domain identity.

This request corrects the administration contract only. It does not complete the Business editor, redesign Personal Brand, or publish any live master.

## Canonical contract

| Active ecosystem | `ecosystemType` | `site.id` | `site.domain` | Public URL |
| --- | --- | --- | --- | --- |
| Producto | `PRODUCT` | `ganomaster` | `product.ganomaster.pro` | `https://product.ganomaster.pro` |
| Negocio VSL | `BUSINESS` | `ganomaster-business` | `business.ganomaster.pro` | `https://business.ganomaster.pro` |
| Marca Personal | `PERSONAL_BRAND` | `ganomaster-personal-brand` | `brand.ganomaster.pro` | `https://brand.ganomaster.pro` |

`ganomaster.pro` is the showcase. It must not be submitted or described as the Product master domain.

## Required behavior

- Derive the active master contract from the selected ecosystem tab; do not maintain independent hardcoded site/domain values in event handlers.
- The generation payload must submit the matching `ecosystemType`, `site.id`, and `site.domain` from the table above.
- Generate, preview, publish, verification, history links, labels, badges, confirmation copy, success copy, and error copy must reference the active ecosystem's canonical site and public URL.
- Switching tabs must replace all derived identity values. State from Producto must not leak into Negocio or Marca Personal.
- Remove remaining operator-facing copy that says Producto publishes or verifies at `ganomaster.pro`.
- Keep the showcase link separate and clearly labeled as showcase/vitrina when it is present.
- Preserve existing Product form values, analytics fields, Meta Pixel assignment, publication approval, history, and replication behavior.
- Preserve the current Business and Personal Brand shells; do not invent missing editing functionality in this request.

## Safety requirements

- Do not call publication, replication, verification, DNS, SFTP, Cloudflare, Hostinger, or production operations during implementation.
- Do not alter backend validation to accept a mismatched master.
- Do not make `ganomaster.pro` an alias or fallback for `product.ganomaster.pro`.
- Do not silently coerce Business or Personal Brand to `PRODUCT`.
- If a UI action is not implemented for an ecosystem, keep it truthfully disabled or labeled pending instead of submitting Product data.

## Allowed files/modules

- `app/web/components/master-site-management-view.tsx`
- A small frontend-only master-contract helper under `app/web/lib/` only if needed to avoid duplicate literals.
- Matching completion report.

## Excluded files/modules

- `app/web/server/**`
- `app/web/app/api/**`
- `app/web/prisma/**`
- `plantillas-de-pagina/**`
- `showcase/**`
- `app/web/components/personal-brand-blocks-view.tsx`
- Landing Builder, Domains, Analytics, Partners, referrals, mobile navigation, and dashboard components.
- Docker, Easypanel, environment variables, dependencies, generated sites, provider integrations, and production data.

## Explicitly out of scope

- Business form implementation.
- Personal Brand desktop preview or template redesign.
- Unified editor layout across the three ecosystems.
- Partner-domain routing and the two-ecosystem policy.
- DNS/SSL telemetry.
- Master publication or partner replication.
- Visual cleanup unrelated to canonical identity.

## Parallel safety

- Safe beside referral-data diagnosis because it edits no referral files.
- Safe beside Landing Builder preview diagnosis while that work remains read-only.
- Not safe beside another task editing `master-site-management-view.tsx` or a shared frontend master-contract helper.
- If `AGR-20260809-002` or another active request now edits this component, stop and report the overlap before implementation.

## Acceptance criteria

1. On Producto, the submitted payload contains `PRODUCT`, `ganomaster`, and `product.ganomaster.pro`.
2. On Negocio VSL, any enabled generation action contains `BUSINESS`, `ganomaster-business`, and `business.ganomaster.pro`; otherwise the action remains explicitly unavailable and never submits Product data.
3. On Marca Personal, any enabled generation action contains `PERSONAL_BRAND`, `ganomaster-personal-brand`, and `brand.ganomaster.pro`; otherwise the action remains explicitly unavailable and never submits Product data.
4. Moving Producto -> Negocio -> Marca Personal -> Producto cannot retain another ecosystem's ID/domain.
5. No Product operator copy claims publication or verification at `ganomaster.pro`.
6. `ganomaster.pro` appears only as showcase/vitrina where relevant.
7. Existing Product analytics and Meta Pixel values survive form updates and payload generation.
8. No backend, template, provider, generated-site, or production file changes are present in the branch.

## Verification

- Targeted ESLint for every modified frontend file.
- `npm run build` from `app/web`.
- Manual desktop validation of all three tab transitions.
- Manual mobile validation that canonical labels and actions do not overflow.
- Inspect the browser network payload for each enabled generation action without completing a live publication.
- Confirm no request is sent with a site/domain pair belonging to another ecosystem.

## Required report and branch

- Report: `brain/agent-requests/antigravity/reports/AGR-20260810-001_master_sites_ecosystem_contract_DONE.md`.
- Suggested branch: `antigravity/AGR-20260810-001-master-sites-ecosystem-contract`.
- PR target: `main`.
