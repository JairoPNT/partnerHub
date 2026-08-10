# PH-041A - Ecosystem-aware generation service

Status: Completed
Date: 2026-08-10
Owner: Codex
Model tier: Balanced

## Outcome

The generation service now selects the canonical source directory and generated master from the requested `ecosystemType`.

| Ecosystem | Canonical directory | Generated master |
| --- | --- | --- |
| PRODUCT | `plantillas-de-pagina/producto` | `ganomaster` |
| BUSINESS | `plantillas-de-pagina/business` | `ganomaster-business` |
| PERSONAL_BRAND | `plantillas-de-pagina/personal-brand` | `ganomaster-personal-brand` |

An explicitly supplied master is accepted only when it is the canonical master for the same ecosystem. Cross-ecosystem selection stops before file copying or output replacement.

## Changed areas

- `app/web/server/services/ecosystemTemplateResolver.ts`
- `app/web/server/services/ecosystemTemplateResolver.test.ts`
- `app/web/server/services/ecosystemService.ts`
- `app/web/server/services/productPageGenerationService.ts`
- `app/web/package.json`

## Verification

- `npm.cmd run test:ecosystem-templates`: 8/8 passed.
- Targeted ESLint for the four changed service/test files: passed with zero warnings.
- `npm.cmd run build`: passed; 31/31 static routes generated.
- Repository-wide lint remains blocked by five pre-existing frontend errors in files outside PH-041A. No unrelated frontend files were changed.

## Boundaries preserved

- No UI or React changes.
- No provider, Cloudflare, Hostinger, SFTP, DNS, Prisma, or production mutations.
- No partner hostname policy; that remains PH-041B after the two-ecosystem product decision.
- No master publication; that remains PH-041C after the frontend contract is corrected.

## Follow-up

Create `AGR-20260810-001` only after PH-041A is merged. That request must correct the `/master-sites` payload and operator copy for each active ecosystem.
