# CDX-20260825-006 — Hostinger DNS payload validation

## Objective

Determine whether Hostinger accepts the exact approved DNS mutation payload without changing the DNS zone or resuming retained provisioning.

## Allowed scope

- Call only `POST https://developers.hostinger.com/api/dns/v1/zones/jairopinto.pro/validate`.
- Validate only the proposed `negocio` A record for the authoritative IPv4.
- Return status/category and a deterministic payload hash without provider response bodies or secrets.
- Package one short Sh-compatible maintenance command.

## Excluded scope

- No `PUT`, `DELETE`, DNS mutation, provisioning resume, claim/target/journal change, Cloudflare call or publication.
- No fallback base URL or operator-provided URL.

## Dependencies

- CDX-20260825-005 result: Hostinger GET returned HTTP 200 and the expected record is absent.
- Official Hostinger DNS validation endpoint and request model.
