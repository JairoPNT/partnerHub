# Personal Brand apex package and publication-preview design

## Purpose

Add the backend-only, non-mutating preparation path that makes it possible to
review a Personal Brand publication for the apex domain. This follows the
merged root-domain contract: Personal Brand owns the apex, while Product and
Business retain their active fixed subdomains.

The first delivery produces deterministic local preview evidence only. It
does not create a PublishingTarget, mutate DNS, call Hostinger, create an SFTP
capability, publish files, deploy, or alter any production state.

## Fixed identity

The initial reviewed subject is Jairo's Personal Brand:

| Field | Value |
| --- | --- |
| owner key | `f403f29e-95c8-4825-9320-967376443020` |
| Personal Brand site ID | `jairo-pinto` |
| ecosystem | `PERSONAL_BRAND` |
| base domain / canonical public host | `jairopinto.pro` |
| canonical master package ID | `ganomaster-personal-brand` |

No customer-specific values may be accepted from command-line endpoint or URL
arguments. The command binds this identity in code and reports hashes instead
of credentials or file contents.

## Package contract

The Personal Brand master package mirrors the safety mechanics of the existing
Business master-package workflow, but is its own implementation and identity:

- Source is only `plantillas-de-pagina/personal-brand/`.
- Required assets and config are explicitly allowlisted; special files and
  path traversal are rejected.
- The canonical config must declare `PERSONAL_BRAND` and
  `ganomaster-personal-brand` before it is accepted.
- The expected package inventory and manifest are hashed deterministically.
- A future local guarded APPLY may install only
  `/data/generated-sites/ganomaster-personal-brand` using an owned claim,
  private staging directory, atomic rename, inventory re-check and audit
  journal. That APPLY is deliberately not run in this ticket.

The preview reports whether the master package is absent, current, drifted or
blocked. It never creates the package as a side effect.

## Apex target and publication preview

The preview reads only the approved Personal Brand source, entitlement and a
previously persisted target. It validates all of the following:

1. Entitlement includes `PERSONAL_BRAND` for Jairo's owner key.
2. Source identity is `jairo-pinto` / `PERSONAL_BRAND` and its hash is pinned
   in the plan material.
3. The target, if present, is version 2, has site ID `jairo-pinto`, canonical
   host exactly `jairopinto.pro`, a non-empty provider-derived `remoteRoot`,
   and `READY` provisioning with DNS and SSL ready.
4. The package inventory matches the canonical Personal Brand master package.
5. A generic publication preview receives only the fixed identity, validated
   hashes and target facts. No SFTP adapter is constructed and no remote write
   is allowed.

Absent target is a normal blocked preview reason, not an invitation to infer a
root directory. A mismatched host, target identity, stale hash or incomplete
state is blocked fail-closed.

## Commands and authorization boundaries

The code exposes two non-mutating commands:

- `maintenance:jairo-personal-brand-master-package` defaulting to `PREVIEW`.
- `maintenance:jairo-personal-brand-publication-preview` defaulting to
  `PREPARE_AND_PREVIEW` without local or provider writes.

Any future APPLY mode must require a dedicated confirmation string and an
expected plan hash. It remains out of scope to invoke it. A later ticket must
separately define and authorize each of:

1. local master-package APPLY;
2. apex target provisioning/DNS/SSL gate;
3. SFTP capability probe;
4. publication job enqueue or guarded publication APPLY.

## Error and reporting behavior

Commands emit structured JSON with request ID, mode, `changed:false`, plan
hash, redacted connection facts when relevant, and explicit blocked reasons.
They never print environment values, credentials, remote file contents or
user data beyond the already allowlisted identity.

Examples of fail-closed reasons include:

- `PERSONAL_BRAND_MASTER_PACKAGE_MISSING`;
- `PERSONAL_BRAND_SOURCE_IDENTITY_INVALID`;
- `PERSONAL_BRAND_TARGET_MISSING`;
- `PERSONAL_BRAND_APEX_TARGET_INVALID`;
- `PERSONAL_BRAND_TARGET_NOT_READY`;
- `PERSONAL_BRAND_PACKAGE_DRIFT`.

## Verification

Tests must demonstrate source/config rejection, deterministic package hashes,
no mutation during master preview, no target inference, valid READY apex
target preview, and blocking on absent/drifted/non-apex targets. Existing
Business, Product, route-resolution, provider, and generic job behavior must
remain unchanged. Focused Node tests, exact ESLint of changed files, the
relevant existing publication-target tests and `git diff --check` are required.

## Scope boundaries

Included: backend scripts, their tests, package scripts, and the ticket
request/report/operational memory.

Excluded: React/templates visual changes, DNS records, Hostinger, Cloudflare,
SFTP, EasyPanel, secrets, remote files, publication, deploys, and production
mutations.
