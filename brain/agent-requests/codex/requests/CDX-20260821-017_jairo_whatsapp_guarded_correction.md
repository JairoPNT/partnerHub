# CDX-20260821-017 — Jairo WhatsApp guarded correction

Owner: Codex Backend.

## Scope

Correct only `onboardingData.whatsapp` for activation lead
`f403f29e-95c8-4825-9320-967376443020`, from `+5673188430283` to the
CEO-authorized `+573188430283` (`wa.me` digits `573188430283`).

## Contract

- DRY_RUN uses exactly one allowlisted lead and returns `changed:false`.
- It pins the complete `leads.json` SHA-256 and the supplied canonical lead
  snapshot SHA-256 `21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb`.
- It creates an audit-only backup, proves a one-field diff and emits a planHash.
- APPLY is a separate explicit mode and confirmation. It requires the reviewed
  audit package and planHash, takes an exclusive atomic claim, rechecks drift,
  writes atomically, post-verifies, journals and supports safe idempotent rerun.
- Rollback is owner-token guarded; stale/incomplete claims and journal drift
  block fail-closed and are never cleaned automatically.

## Boundaries

Allowed: maintenance script/tests, npm command, request/report documentation.
Excluded: Business sources, UI, DNS, Hostinger, publishing, other partners and
all production execution. Dependency: CDX-016 commit `88f9b898...` integrated in
`origin/main`. Parallel-safe only with tickets that do not edit these files or
the activation-lead store.
