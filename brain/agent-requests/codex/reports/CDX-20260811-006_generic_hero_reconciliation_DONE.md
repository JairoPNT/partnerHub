# CDX-20260811-006 - Completion report

- Request ID: `CDX-20260811-006`
- Owner: Codex
- Branch: `codex/CDX-20260811-006-generic-hero-reconciliation`
- Outcome: The existing guarded reconciliation command now supports any valid partner `siteId` while preserving the Claudia-compatible command.

## Usage

```sh
npm run maintenance:reconcile-partner-heroes -- --site-id=jairo-pinto
npm run maintenance:reconcile-partner-heroes -- --site-id=jairo-pinto --apply --confirm=jairo-pinto
```

The first command is dry-run. The second writes only after explicit confirmation.

## Verification

- Focused tests: existing behaviors plus generic partner site: PASS.
- Source validation rejects path traversal and non-HTTPS heroes.
- Existing Claudia command remains backward-compatible.
- `git diff --check`: required before merge.

No production data is modified by this ticket.
