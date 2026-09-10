# CDX-20260909-002 — Personal Brand publication readiness diagnostic

## Owner

Codex (Backend Lead Engineer)

## Single outcome

Determine whether Personal Brand can safely enter the durable publication
pipeline already proven for Business, and identify the smallest next backend
contract required before any production preview or publication.

## Allowed areas

- Read-only inspection of Personal Brand template, generation, provisioning,
  publication-job, and hostname-contract modules.
- `brain/` documentation and this request/report pair.

## Excluded areas

- React, Tailwind, visual template implementation, UX, or branding changes.
- Provider, DNS, Cloudflare, SFTP, EasyPanel, publication, and production
  mutations.
- Credentials, secrets, customer data, or raw provider responses.

## Dependencies

- Business publication/backfill completion.
- CDX-20260909-001 project-memory reconciliation.

## Parallel-safe with

- A separate Antigravity-owned visual-identity request, provided it does not
  edit backend publication or hostname-contract modules.

## Integration notes

The next implementation ticket must preserve the root-domain rule for a
three-ecosystem partner: Personal Brand at the apex, Product at `producto.`,
and Business at `negocio.`. It must not reuse the existing subdomain-only
provisioning path without resolving that contract.
