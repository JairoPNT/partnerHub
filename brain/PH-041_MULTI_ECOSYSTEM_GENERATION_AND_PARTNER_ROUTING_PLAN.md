# PH-041 - Multi-ecosystem generation and partner routing plan

Status: Planned
Date: 2026-08-09
Architecture owner: ChatGPT / Codex orchestration
Product owner: Jairo

## Objective

Make master generation, master verification, and partner-domain routing truthful for Product, Business, and Personal Brand without combining backend, frontend, infrastructure, and production rollout into one mega-task.

## Confirmed master architecture

The existing PH-034 master contract remains authoritative:

| Ecosystem | Canonical site ID | Canonical public host | Hostinger directory |
| --- | --- | --- | --- |
| Product | `ganomaster` | `product.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/product` |
| Business | `ganomaster-business` | `business.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/business` |
| Personal Brand | `ganomaster-personal-brand` | `brand.ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html/brand` |
| Showcase | `ganomaster-showcase` | `ganomaster.pro` | `/home/u658137804/domains/ganomaster.pro/public_html` |

The English master hostnames are intentional and are independent from the Spanish partner hostname convention.

## Production finding on 2026-08-09

Product master publication reached the correct destination:

- Public host: `product.ganomaster.pro`.
- Remote root: `/home/u658137804/domains/ganomaster.pro/public_html/product`.

Publication then returned `VERIFY_FAILED` with one failed check. Static inspection identifies a deterministic domain mismatch:

- `productPageVerificationService` expects `product.ganomaster.pro` for site ID `ganomaster`.
- `master-site-management-view.tsx` still generates the master source with hardcoded `site.domain = ganomaster.pro`.
- The public `config.js` therefore declares the root domain while verification correctly reads the Product master host.
- The same frontend component still displays legacy copy such as `Publicar en ganomaster.pro` and reports verification against `ganomaster.pro`.

The exact failed check should still be confirmed from the expanded production verification detail before implementation, but `site_domain_matches` is the expected failure given the current code and the single-check result.

## Confirmed partner routing rule

### One purchased ecosystem

When a partner has exactly one active ecosystem, that ecosystem is served from the partner root domain:

| Purchased ecosystem | Public host example |
| --- | --- |
| Product only | `claudiacalero.pro` |
| Business only | `claudiacalero.pro` |
| Personal Brand only | `claudiacalero.pro` |

This preserves the current simple commercial delivery for a single ecosystem.

### Full three-ecosystem plan

When a partner has all three ecosystems:

| Ecosystem | Public host example |
| --- | --- |
| Personal Brand | `claudiacalero.pro` |
| Product | `producto.claudiacalero.pro` |
| Business | `negocio.claudiacalero.pro` |

The root domain becomes the partner's Personal Brand entry point. Product and Business receive isolated subdomains.

## Pending product decision: exactly two ecosystems

Do not implement two-ecosystem routing until Jairo confirms the rule.

Recommended rule:

1. If Personal Brand is included, Personal Brand owns the root domain and the second ecosystem uses `producto.` or `negocio.`.
2. If the combination is Product + Business, onboarding must select one `primaryEcosystem` for the root; the other uses its Spanish subdomain.

Alternative: require all multi-ecosystem partners, including two-service plans, to use subdomains and reserve the root for a future Personal Brand page. This is not approved yet.

## Ticket sequence

### PH-041A - Ecosystem-aware generation service

Owner: Codex
Model tier: Balanced
Dependency: None

Single outcome:

Select the correct canonical template and generated master by `ecosystemType`.

Allowed areas:

- `app/web/server/services/productPageGenerationService.ts`
- A focused ecosystem-template resolver/helper and tests under `app/web/server/services/`
- `app/web/package.json` only for a focused test command
- PH-041A documentation

Required behavior:

- Canonical master generation:
  - PRODUCT -> `plantillas-de-pagina/producto`
  - BUSINESS -> `plantillas-de-pagina/business`
  - PERSONAL_BRAND -> `plantillas-de-pagina/personal-brand`
- Partner generation:
  - PRODUCT -> generated master `ganomaster`
  - BUSINESS -> generated master `ganomaster-business`
  - PERSONAL_BRAND -> generated master `ganomaster-personal-brand`
- Reject a supplied master that belongs to another ecosystem.
- Preserve PRODUCT compatibility.
- No UI, provider calls, SFTP publication, DNS, Prisma, or production mutation.

Acceptance:

- Focused tests prove all three canonical selections and all three master selections.
- Cross-ecosystem master selection fails safely.
- Targeted lint and production build pass.

### AGR-20260810-001 - Master administration ecosystem contract

Owner: Antigravity
Dependency: PH-041A merged contract

Single outcome:

Make `/master-sites` generate and display the active ecosystem's canonical site ID and domain rather than the hardcoded Product/root pair.

Expected allowed area:

- `app/web/components/master-site-management-view.tsx`
- Matching AGR report

Required behavior:

- Active ecosystem determines `site.id`, `site.domain`, `ecosystemType`, canonical URL, generate copy, publish copy, and verification copy.
- Product uses `ganomaster` / `product.ganomaster.pro`.
- Business uses `ganomaster-business` / `business.ganomaster.pro`.
- Personal Brand uses `ganomaster-personal-brand` / `brand.ganomaster.pro`.
- Remove stale operator-facing references that claim Product publishes to `ganomaster.pro`.
- Do not add backend behavior or publish production masters inside the request.

Acceptance:

- Each active ecosystem submits its own correct payload.
- Switching tabs cannot reuse another ecosystem's ID/domain state.
- Targeted lint, build, and responsive manual checks pass.

### PH-041B - Partner hostname policy and target resolution

Owner: Codex
Dependency: PH-041A and the two-ecosystem product decision

Single outcome:

Resolve the intended partner public host and isolated remote root from the partner's active ecosystem set and primary/root assignment.

Required behavior:

- One ecosystem retains root-domain backward compatibility.
- Full three-ecosystem routing follows the confirmed Spanish partner convention.
- Existing root-domain PRODUCT partners are not silently moved.
- Hostname choice is explicit and persisted in PublishingTarget; generation must not infer production infrastructure from display labels.
- Conflicts stop before Hostinger, DNS, or SFTP mutation.
- No UI or live provider operations.

### PH-041C - Master publication pilot

Owner: Codex + Jairo production approval
Dependency: PH-041A and AGR-20260810-001 merged and deployed

Single outcome:

Generate, publish, and verify the three canonical masters one at a time.

Ordered gates:

1. Product: regenerate and verify `product.ganomaster.pro`.
2. Business: generate preview, inspect, publish, and verify `business.ganomaster.pro`.
3. Personal Brand: generate preview, inspect, publish, and verify `brand.ganomaster.pro`.

Stop after any failed ecosystem. Do not batch all three publications.

### PH-041D - One-partner routing pilot

Owner: Codex + Jairo production approval
Dependency: PH-041B and PH-041C

Single outcome:

Validate one approved partner through generation, provisioning if needed, publication, and public verification before broader replication.

Do not use bulk replication for the pilot.

## Meta event relationship

AGR-20260809-005 is merged through PR #95 and adds Product-only custom click events to the canonical Product template:

- `WhatsAppClick`
- `StoreClick`

Those changes reach public masters and partners only after their pages are regenerated and published. They must not be used as a reason to bypass PH-041A or publish Business/Personal Brand through the Product generator.

## Morning start order

1. Confirm the expanded failed-check name for the latest `ganomaster` publication.
2. Open and execute PH-041A only.
3. Review PH-041A tests/build and merge before creating the Antigravity request.
4. Create `AGR-20260810-001` from the stable PH-041A contract.
5. Obtain Jairo's two-ecosystem routing decision before opening PH-041B.

## Do not do first

- Do not regenerate Product again with the current hardcoded master payload.
- Do not manually upload Business or Personal Brand previews into production paths.
- Do not repoint `ganomaster.pro` away from the showcase.
- Do not provision or publish partner subdomains before PH-041B.
- Do not combine PH-041A, AGR-20260810-001, PH-041B, and production publication in one branch or PR.
