# CDX-20260821-014 — Jairo Business clean master alignment

## Owner and scope

Codex Backend. Align the CDX-013 DRY_RUN with the clean Business master shipped by
AGR-20260821-002. Allowed: the Jairo maintenance script/tests and this ticket/report.
Excluded: UI/template files, production inputs, EasyPanel, APPLY, publishing and DNS.

## Contract

- Require the approved canonical Hero and pilot MP4 from the runtime artifact.
- Derive those fields from the SHA-256-pinned canonical artifact, not from
  `business-profile.json`.
- Continue deriving the VSL poster exclusively from Product Hero.
- Reject profile attempts to override canonical Hero media or VSL.
- Keep the command DRY_RUN-only and `changed:false`.

Dependency: AGR-20260821-002 / PR #152 / origin/main `407de1d`.
