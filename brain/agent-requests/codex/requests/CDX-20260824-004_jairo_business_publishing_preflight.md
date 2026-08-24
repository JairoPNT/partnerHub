# CDX-20260824-004 — Jairo Business publishing preflight

## Owner and outcome

Codex Backend. Provide a fail-closed, strictly read-only PREVIEW for one
allowlisted Business source and its canonical PublishingTarget identity.

## Allowed scope

- Raw read of the approved saved source, current entitlement snapshot and
  PublishingTargets v2 inventory.
- Presence-only validation of provider/SFTP/IPv4 configuration.
- Validation that the published Business master package required by saved-source
  regeneration exists.
- A deterministic plan for the single Business site.
- Focused tests, runtime packaging and this request/report.

## Safety contract

- `mode:PREVIEW`, `changed:false`; APPLY flags are rejected.
- No provider or public-network calls and no filesystem writes.
- Exactly one allowlisted site and SHA-256 pinned source/entitlement inputs.
- Raw target reads only; do not call the current GET service because legacy
  migration can persist data.
- Invalid/legacy targets, immutable identity conflicts, drift, missing
  entitlement, missing configuration or missing master package block.
- Legacy SFTP-root fallback is prohibited.
- `HOSTINGER_SFTP_REMOTE_ROOT` is neither required nor accepted as the Business
  destination. The only valid destination is the provisioned v2
  `PublishingTarget.remoteRoot`.
- Apex is preserved and never a PublishingTarget. Product and Brand are excluded.

The public repository intentionally omits production hashes, identifiers,
secrets and executable APPLY payloads. They belong only in the restricted
orchestrator audit channel.

## Excluded scope

Provisioning, DNS, Hostinger API calls, SFTP, regeneration, publication,
verification writes, redirects, Product, Brand, Landing Builder, payments, UI
and production execution.

## Release gate

No PR, deploy or EasyPanel execution without orchestrator audit.
