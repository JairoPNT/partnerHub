# CDX-20260824-011 — Entitlement endpoint and audience guard

## Status

IMPLEMENTED FOR AUDIT. No external execution authorized.

## Owner and scope

- Owner: Codex Backend.
- Dependency: CDX-009 and the path-specific Access application.
- Allowed: entitlement snapshot helper, Cloudflare JWT audience selection for
  the entitlement route, focused tests and docs.
- Excluded: Cloudflare writes, token/policy changes, EasyPanel, provisioning,
  provider/DNS, production snapshot, PREVIEW/APPLY and UI.

## Objective

Remove operator-supplied endpoint URLs. Service-token snapshot mode uses one
compiled exact Jairo entitlement endpoint. Any injected URL, Markdown rendering,
lookalike path, query drift or endpoint flag is rejected before fetch.

The path-specific Access application has its own application audience. The
entitlement route must validate against
`CLOUDFLARE_ACCESS_ENTITLEMENT_AUD`, not the default broad application
`CLOUDFLARE_ACCESS_AUD`. Missing/mismatched route audience remains fail-closed.
No multiple-audience fallback is allowed because it would unintentionally keep
the broader app audience valid on the narrowed route.

## Runtime command contract

The post-deploy Service Token command requires only mode, output directory and
the explicit empty-staging resume flag. It contains no URL, cookie or secret.
Credentials and the route-specific audience remain environment-only.

## Authorization

Implementation/tests/push only. PR unopened. No EasyPanel, Cloudflare,
production snapshot, PREVIEW or APPLY.
