# CDX-20260902-001 — Business WhatsApp CTA generation contract

Owner: Codex
Model tier: Balanced
Dependency: CDX-20260827-001 production preparation blocked with `BUSINESS_WHATSAPP_CTA_INVALID`

## Single outcome

Make the backend package generator emit explicit, deterministic WhatsApp CTA
URLs for partner Business pages from the already validated distributor number
and message, so guarded publication accepts the generated package without
trusting arbitrary CTA URLs from stored source data.

## Allowed files/modules

- `app/web/server/services/productPageGenerationService.ts`
- `app/web/server/services/businessWhatsappCta.ts`
- `app/web/server/services/businessWhatsappCta.test.ts`
- `app/web/server/services/productPageGenerationBusinessCta.test.ts`
- `app/web/package.json`
- This request and its matching report

## Excluded files/modules

- UI, React, Tailwind and canonical Business template assets
- Partner source files, generated packages and PublishingTarget state
- SFTP, Hostinger, DNS, SSL and provider clients
- Database, authentication, payment and entitlement contracts

## Required behavior

- Preserve only approved CTA display copy from the parsed Business source.
- Derive both primary and secondary URLs from the normalized WhatsApp number
  and non-empty default message.
- Always emit an empty `directRegisterUrl` for partner Business generation.
- Ignore source-supplied CTA URLs and unrelated fields; never propagate a
  purchase, registration or arbitrary external URL.
- Leave Product and Personal Brand generation behavior unchanged.

## Verification

- Focused unit tests for exact URL derivation, copy preservation, unsafe input
  rejection and arbitrary-field stripping.
- Existing Business source/publication regressions.
- Focused ESLint, TypeScript/production build and `git diff --check`.

## Parallel safety

Not parallel-safe with other work editing `productPageGenerationService.ts` or
the Business generation contract. Parallel-safe with documentation-only and
frontend tickets outside the allowed files.

## Integration note

After merge and auto-deploy, renew the short-lived SFTP capability, rerun the
package preparation PREVIEW and obtain a new separately authorized plan hash.
