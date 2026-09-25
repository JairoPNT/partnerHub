# App-owned Business preflight inputs

**Ticket:** CDX-20260922-002
**Owner:** Codex (Backend)
**Status:** Design approved by Jairo; implementation plan pending review
**Depends on:** CDX-20260922-001 read-only Business preflight contract verification

## Intent and success criteria

An operator must be able to request a Business publication preflight by the
PartnerHub site identity, without locating, copying, or exposing a server file
path. Before every preflight, PartnerHub must obtain a fresh entitlement from
the authoritative internal entitlement flow. It must fail closed when that
refresh cannot be completed.

Success is a redacted, deterministic preflight result that says whether the
specific Business site is ready and why it is blocked when it is not. This
ticket does not publish a site or contact a hosting, DNS, or SFTP provider.

## Current gap

The legacy `jairo-business-publishing-preflight` command requires an operator
to pass `--manifest=<path>`. That path points to a historical, restricted input
directory. It is not a user-operable setting and should not be an operational
requirement for Jairo.

## Decision

Add an app-owned preflight-input resolver and a single identity-based read-only
Business preflight entrypoint. The new entrypoint receives only a site ID from
its trusted caller. It will not accept a manifest path, arbitrary directory,
hash, URL, entitlement payload, or source override.

For each invocation it will:

1. Allowlist the requested identity and load its saved source and PublishingTarget
   using fixed application-owned roots.
2. Obtain a fresh entitlement through the existing authoritative internal
   entitlement service contract, scoped to the requested identity.
3. Validate the entitlement identity and Business entitlement before creating
   an ephemeral private input bundle.
4. Invoke the existing read-only preflight against that bundle.
5. Remove the bundle in `finally`, then return a redacted result.

There is no fallback to a previously saved entitlement. A refresh failure is a
stable blocked result, not a reason to use stale authorization data.

## Boundary and safety contract

### Allowed

- Read saved Business source, v2 PublishingTarget and published Business master
  package from fixed app-owned directories.
- Make the one authenticated internal entitlement read needed to refresh
  authorization.
- Create and delete an exclusive, owner-only ephemeral local bundle below a
  fixed application-owned scratch root.
- Run the existing preflight in `PREVIEW` mode only.

### Forbidden

- No public HTTP input, user-supplied endpoint, URL, pathname or hashes.
- No provider API call, SFTP connection, DNS mutation, content regeneration,
  publication job enqueue, or deployment.
- No retention of entitlement contents, service credentials, temporary manifest
  or temporary entitlement snapshot after completion.
- No secret, internal path, raw entitlement, raw source or token in stdout,
  API response, logs, request files, reports, or tests.

## Components and data flow

`BusinessPreflightInputResolver` owns the new boundary. Its input is an exact
allowlisted `siteId`; its output is an opaque prepared input handle usable only
by the new orchestrator in the same invocation.

`BusinessFreshEntitlementReader` is a narrow adapter over the current internal
entitlement capability. It returns validated domain data in memory. It never
accepts an endpoint from the caller and uses service credentials from the
runtime environment only.

`runAppOwnedBusinessPublicationPreflight` orchestrates fixed-root reads,
fresh-entitlement validation, temporary bundle creation, existing preflight
execution and cleanup. Its result maps native preflight outcomes into the
operator vocabulary `READY`, `BLOCKED`, or `ENTITLEMENT_REFRESH_FAILED` while
retaining structured, non-sensitive reason codes.

The initial implementation is narrowly allowlisted to `jairo-pinto-business`.
Generalizing to other clients is a separate ticket after this safety contract
is proven in production.

## Failure handling

| Condition | Result | Side effect |
| --- | --- | --- |
| Unknown or non-Business site ID | `SITE_NOT_ALLOWLISTED` | None |
| Entitlement reader fails, returns invalid identity, or has no Business grant | `ENTITLEMENT_REFRESH_FAILED` or `BUSINESS_NOT_ENTITLED` | Bundle is never created or is cleaned up |
| Saved source/target/master package is absent or inconsistent | Existing redacted preflight block reason | Bundle is cleaned up |
| Existing preflight finds a configuration or readiness issue | `BLOCKED` with its reason codes | Bundle is cleaned up |
| Cleanup fails after a result | Fail closed with `EPHEMERAL_INPUT_CLEANUP_FAILED` | No external action |

An unexpected error produces a stable redacted code; it must not serialize the
underlying error message when that message could contain a path or credential.

## Verification

Focused tests must prove:

1. exact allowlist enforcement and rejection of caller-controlled paths;
2. a fresh entitlement is requested on every invocation;
3. entitlement refresh failure does not fall back to stored data;
4. the temporary bundle is removed after success and after preflight failure;
5. output has no secret, pathname, entitlement content or provider operation;
6. the adapter cannot reach publication, SFTP, DNS, Hostinger or Cloudflare
   provider modules.

The ticket also requires the focused legacy preflight tests and relevant lint,
typecheck/build verification. A controlled runtime invocation remains a later,
separately authorized validation step.

## Delivery slices

1. **CDX-20260922-002A — Resolver and entitlement adapter.** Codex backend;
   isolated new modules and unit tests only.
2. **CDX-20260922-002B — App-owned CLI entrypoint and redacted result contract.**
   Depends on 002A; no provider or publication modules.
3. **CDX-20260922-002C — Controlled runtime validation and evidence.** Depends
   on 002B merge/deploy and requires Jairo's explicit runtime authorization.

Slices A and B may be planned in one implementation branch only if their
modules do not overlap with an active ticket; slice C is always separate due to
its operational side effect of an authenticated entitlement read.

## Out of scope

Personal Brand, Product, generic multi-tenant rollout, UI changes, automatic
publication approval, provider setup, credentials rotation, DNS, SFTP, and
publication are explicitly out of scope.
