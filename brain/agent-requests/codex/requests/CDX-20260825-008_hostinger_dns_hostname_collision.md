# CDX-20260825-008 — Hostinger DNS hostname collision diagnostic

## Owner

Codex — Backend Lead.

## Objective

Determine whether any DNS record type currently occupies `negocio.jairopinto.pro` after Hostinger accepted the proposed payload syntax but rejected the real update with HTTP 422.

## Allowed scope

- Call only the official Hostinger GET zone endpoint.
- Inspect every record type bound to the exact Business hostname.
- Return only record type plus enabled/disabled counts.
- Package one short Sh-compatible command.

## Excluded scope

- No PUT, POST, DELETE, DNS mutation, provisioning recovery, claim/target/journal mutation or publication.
- No DNS record contents, provider bodies, credentials or fallback endpoints in output.

## Dependencies

- CDX-20260825-006 payload validation: HTTP 200.
- CDX-20260825-007 real update: HTTP 422 with retained claim and target.

## File boundaries

Only the new diagnostic script/test, package/Docker transport and this request/report.

