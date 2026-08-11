# CDX-20260811-006 - Generic partner hero reconciliation

- Owner: Codex
- Model tier: Balanced
- Scope: Extend the existing guarded hero reconciler to any partner `siteId`.
- Allowed files/modules: existing maintenance script and tests, `app/web/package.json`, and ticket/report documentation.
- Excluded files/modules: frontend, generation, publication, templates, production data, and bulk mutation.
- Dependencies: `CDX-20260811-005` deployed.

## Contract

- `--site-id=<slug>` selects exactly one partner; the default remains `claudia-calero` for backward compatibility.
- Dry-run remains the default.
- Apply requires `--apply --confirm=<same-site-id>`.
- Source heroes must be valid HTTPS URLs and exactly one activation lead must match.
- Only hero fields and timestamps change; a backup is created before an effective write.
