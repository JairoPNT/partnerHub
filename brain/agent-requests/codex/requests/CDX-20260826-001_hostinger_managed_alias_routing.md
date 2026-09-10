# CDX-20260826-001 — Hostinger managed ALIAS routing

## Owner

Codex — Backend Lead.

## Objective

Allow the guarded Hostinger provisioning service to resume `jairo-pinto-business` when the exact hostname is already routed by one unambiguous Hostinger-managed `ALIAS`, without replacing that record with an incompatible `A` record.

## Allowed scope

- Recognize one exact enabled `ALIAS` entry with no disabled or additional records at the target hostname.
- Preserve the existing direct `A` provisioning behavior.
- Make no DNS write when the accepted `ALIAS` already occupies the hostname.
- Bind readiness to public IPv4 resolution and a successful HTTPS response served by Hostinger CDN for the `ALIAS` route.
- Add focused backend regression tests and document the production recovery gate.

## Excluded scope

- No DNS deletion, overwrite or migration.
- No acceptance of CNAME, AAAA, TXT, disabled, multiple or mixed records.
- No SFTP, package publication, apex mutation, Product/Brand mutation, UI or frontend changes.
- No production recovery execution from this ticket.

## Dependencies

- CDX-20260825-008 confirmed one enabled `ALIAS` at `negocio.jairopinto.pro`.
- Public read-only verification confirmed IPv4 resolution and HTTPS through Hostinger CDN.
- The retained provisioning target and claim remain the recovery authority.

## File boundaries

Allowed: Hostinger DNS integration, subdomain provisioning service, their focused tests, and this request/report.

Excluded: frontend, database, auth, payments, generated sources, publication and provider credentials.

## Parallel safety

Not parallel-safe with another ticket editing Hostinger DNS integration or subdomain provisioning. Safe beside unrelated frontend or payment tickets.
