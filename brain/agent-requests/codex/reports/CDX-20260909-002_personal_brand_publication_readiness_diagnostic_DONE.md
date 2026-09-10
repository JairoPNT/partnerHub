# CDX-20260909-002 — DONE

## Result

Personal Brand is partially ready for the durable publication pipeline, but is
not safe to provision or publish for Jairo yet. The publication engine already
supports `PERSONAL_BRAND`; the remaining blocker is the partner hostname and
root-directory contract.

## Verified ready

- The canonical template exists at `plantillas-de-pagina/personal-brand/` and
  identifies itself as `ganomaster-personal-brand` / `PERSONAL_BRAND`.
- The ecosystem resolver maps `PERSONAL_BRAND` to that canonical template and
  master site ID.
- Partner generation, generic guarded publication, durable publication jobs,
  and the worker have explicit `PERSONAL_BRAND` coverage.
- The durable worker resolves the Personal Brand master package at
  `/data/generated-sites/ganomaster-personal-brand` once that package exists.

## Blocking gap

The live backend hostname contract maps `PERSONAL_BRAND` to `brand.<domain>`.
The provisioning service also creates only a Hostinger subdomain from that
label. This conflicts with the approved three-ecosystem routing rule for
Jairo: Personal Brand owns `jairopinto.pro`, while Business remains at
`negocio.jairopinto.pro` and Product belongs at `producto.jairopinto.pro`.

The existing Business master-package and publication-preparation maintenance
scripts are intentionally Business-specific. There is no equivalent guarded
Personal Brand master-package workflow or root-target preparation flow.

## Required next ticket

`CDX-20260909-003 — Personal Brand root-domain target contract`.

It should be a backend-only implementation ticket that:

1. Makes the selected root ecosystem resolve to the apex without creating a
   subdomain, while retaining subdomain behavior for non-root ecosystems.
2. Preserves target identity, tenant isolation, and fail-closed conflict checks.
3. Adds tests for the Jairo three-ecosystem route and legacy compatibility.
4. Stops before master-package creation, SFTP capability, publication preview,
   or production mutation.

After that contract is merged and deployed, a separate ticket can add the
guarded Personal Brand master-package/preview flow. A production publication
will still require a fresh reviewed plan and Jairo's explicit authorization.

## Verification

- Read-only inspection of template, resolver, hostname, provisioning, and
  durable publication-job modules.
- Existing reports reviewed: CDX-20260827-001/002 and CDX-20260902-003/004/005/006.
- No application source, provider configuration, DNS, SFTP, Cloudflare, or
  production state changed.

## Git

- Branch: `codex/CDX-20260909-002-personal-brand-readiness`
- Base: `origin/main` at `e2e6e8e75384597e48050f486eaad72cc9fc1b0c`

## Follow-up

Required: CDX-20260909-003. Visual identity remains a separate Antigravity
request.
