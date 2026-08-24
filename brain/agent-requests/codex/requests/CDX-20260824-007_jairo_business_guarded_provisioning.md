# CDX-20260824-007 — Jairo Business guarded provisioning

## Status

IMPLEMENTED FOR AUDIT. Provider execution is not authorized.

## Ownership and boundaries

- Owner: Codex Backend.
- Dependency: CDX-004 preflight and materialized Business source; independent
  from content publication and CDX-006 capability execution.
- Allowed: one guarded maintenance command, focused tests, runtime transport and
  request/report documentation.
- Excluded: UI, publication, package generation, apex/redirects, Product, Brand,
  Payments, SFTP probe, manual provider APIs and production execution.
- Parallel-safe only with tickets that do not edit provisioning services,
  publishing targets, Docker or package scripts.

## Objective

Provide a local read-only `PREVIEW` and separately gated `APPLY` that invokes
the existing authenticated internal PublishingTargets API, which owns the
supported `subdomainProvisioningService`, Hostinger subdomain/DNS clients and
readiness probes. The exact allowlist is:

- ownerKey `f403f29e-95c8-4825-9320-967376443020`;
- siteId `jairo-pinto-business`;
- BUSINESS / root PERSONAL_BRAND;
- base domain `jairopinto.pro`;
- public host `negocio.jairopinto.pro`.

The final target must be v2, have a provider-derived non-root `remoteRoot`,
`provisioningState=READY` and `publicationState=PENDING`. Apex, Product and
Brand are immutable and content publication is forbidden.

## Gates

`PREVIEW` validates exact source/entitlement hashes and identities, BUSINESS
entitlement, target inventory/conflicts, required configuration presence and
HTTPS internal endpoint. It makes no provider call or local write and returns a
stable `planHash`.

`APPLY` additionally requires:

- mode `APPLY_JAIRO_BUSINESS_PROVISIONING`;
- confirmation `PROVISION_ALLOWLISTED_JAIRO_BUSINESS_TARGET`;
- exact reviewed `planHash`;
- an exclusive local claim with owner token and locked re-preflight.

It calls only the supported internal PublishingTargets API. It never sends an
IPv4 from the body; the API injects the server-controlled configured IPv4.

## Real provider guarantee and recovery

Provisioning is a resumable ensure workflow, not an atomic distributed
transaction. Hostinger/DNS mutations cannot be transactionally rolled back by
the current provider clients. Therefore:

- before provider start, failure removes only the owned local claim;
- after provider start, failure preserves the claim and any PENDING/FAILED
  target for audit and an explicitly approved resume;
- the command never deletes a target after provider start, because that could
  hide an already-created subdomain or DNS record;
- success requires local post-verification of READY/PENDING/remoteRoot, then an
  atomic local journal; reruns validate journal and exact target hash and return
  `ALREADY_APPLIED`, `changed:false`.

No rollback claim is made for provider resources that the supported APIs cannot
verifiably undo.

## Authorization

Implementation, tests and push only. PR, merge, deploy and production PREVIEW
require later gates. APPLY always requires a separate explicit authorization.
