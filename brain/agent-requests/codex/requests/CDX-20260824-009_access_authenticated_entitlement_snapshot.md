# CDX-20260824-009 — Access-authenticated entitlement snapshot

## Status

IMPLEMENTED FOR AUDIT. No Cloudflare or production operation authorized.

## Owner and boundaries

- Owner: Codex Backend.
- Dependency: CDX-008.
- Allowed: isolated snapshot preparer, tests, runtime transport and docs.
- Excluded: Cloudflare policy/token writes, cookie copying, Access bypass,
  provisioning, DNS, EasyPanel, UI, PREVIEW/APPLY execution and provider calls.

## Problem

Cloudflare Binding Cookie ties a browser application's `CF_Authorization` to
`CF_Binding`. Reusing only the human cookie from a container is intentionally
rejected and must not be recommended.

## Supported paths

### A — recommended durable automation

Use a dedicated Cloudflare Access Service Token selected by a `Service Auth`
policy. Keep `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` only in runtime
secret environment variables. Requests use the documented
`CF-Access-Client-Id` and `CF-Access-Client-Secret` headers, never cookies,
reject redirects/non-JSON/non-200 responses, and never persist or print token
values.

Creating the token/policy and setting secrets are separate infrastructure
operations requiring explicit authorization; this ticket performs none.

### B — permitted one-time fallback

An operator may export the already-authorized endpoint JSON from the authenticated
browser. Only the JSON file crosses the boundary: no `CF_Authorization`,
`CF_Binding`, browser storage or headers. The preparer validates exact Jairo
identity, BUSINESS entitlement/host and apex preservation, canonicalizes bytes,
writes mode `0600` through an owned temporary file, renames atomically and emits
only identity plus SHA-256 evidence.

This path is suitable for the punctual PREVIEW snapshot, not durable automation.

## Residue and resume

Existing output blocks. An existing staging directory blocks by default. The
explicit `--resume-empty-staging` flag is accepted only after the directory is
verified byte-empty; any entry/residue blocks and is never removed automatically.

## Official references

- Cloudflare One: Authorization cookie / Binding Cookie.
- Cloudflare One: Service tokens and Service Auth policy.

## Authorization

Implementation/tests/push only. PR not authorized. No EasyPanel, Cloudflare
write, production snapshot, PREVIEW or APPLY.
