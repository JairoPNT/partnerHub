# CDX-20260821-013 — Jairo Business source generation DRY_RUN

## Owner

Codex — Backend Lead.

## Objective

Prepare a strictly read-only source projection for Jairo's canonical Business
identity: `jairo-pinto-business` / `BUSINESS` / `negocio.jairopinto.pro`.

## Allowed areas

- Dedicated maintenance script and focused tests.
- Runtime packaging of the minimum canonical Business config artifact and script.
- Package command and this request/report.

## Inputs

Exactly one allowlisted manifest plus immutable snapshots of:

- activation lead `f403f29e-95c8-4825-9320-967376443020`;
- current entitlement returned by the backend entitlement contract;
- operator-authorized Business profile fields absent from onboarding;
- current Brand and Product sources;
- canonical Business config packaged with the runtime.

Every input is SHA-256 pinned. Entitlement must be `KNOWN`, include `BUSINESS`
and expose the canonical expected target. Historical filenames or inferred names
are not evidence of entitlement.

## Safety contract

- `DRY_RUN` only; always `changed:false`; reject APPLY-like flags.
- Write only an audit package under `.migration-audits`.
- Block missing/placeholder Business data, hash drift, entitlement absence,
  identity/hostname mismatch and destination collision.
- Preserve apex as non-PublishingTarget.
- Never change Brand/Product sources, targets, DNS, Hostinger, SSL, publication,
  regeneration, redirects, payments, ledger or UI.

## Dependencies

- CDX-012 merged in `origin/main`.
- Production input snapshots and hashes must be prepared later by an authorized
  operator before the future DRY_RUN.

## Release gate

No PR, deploy or EasyPanel execution before orchestrator audit.
