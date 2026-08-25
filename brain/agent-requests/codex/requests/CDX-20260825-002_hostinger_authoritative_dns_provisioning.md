# CDX-20260825-002 — Hostinger authoritative DNS provisioning

## Owner

Codex (Backend Lead).

## Scope

Correct the supported provisioning path so domains delegated to Hostinger nameservers use the existing Hostinger DNS integration, not Cloudflare DNS. Align APPLY readiness with the actual provider configuration.

## Evidence

Hostinger control plane for `jairopinto.pro` reports authoritative nameservers `helios.dns-parking.com` and `aster.dns-parking.com`.

## Allowed files/modules

- provisioning route dependency injection
- Jairo in-process provisioning runtime
- guarded provisioning readiness and focused tests
- request/report

## Excluded

- UI, Cloudflare Access, SFTP, publication, APPLY and production execution
- provider contract redesign

## Acceptance

- Both HTTP and in-process supported provisioning inject `HostingerDnsClient`.
- DNS uses `HOSTINGER_API_TOKEN` and optional `HOSTINGER_API_BASE_URL` only.
- Cloudflare DNS variables are not required by PREVIEW/APPLY readiness.
- Existing Hostinger DNS, provisioning, guarded provisioning and API tests pass; lint/build pass.
