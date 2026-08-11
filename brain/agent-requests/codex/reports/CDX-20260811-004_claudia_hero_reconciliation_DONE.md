# CDX-20260811-004 - Completion report

- Request ID: `CDX-20260811-004`
- Owner: Codex
- Branch: `codex/CDX-20260811-004-claudia-hero-reconciliation`
- Outcome: Added a guarded, one-target maintenance command for reconciling Claudia Calero's saved product heroes into activation onboarding.

## Changed files

- `app/web/scripts/reconcile-claudia-heroes.mjs`
- `app/web/scripts/reconcile-claudia-heroes.test.mjs`
- `app/web/package.json`
- request and completion-report documentation for this ticket

## Safety behavior

- Dry-run by default.
- Apply requires `--apply --confirm=claudia-calero`.
- Requires exactly one matching activation lead and two valid HTTPS source heroes.
- Preserves every unrelated lead and onboarding field.
- Creates a timestamped exact backup of `leads.json` before an effective atomic write.
- A repeated apply is a no-op.
- Does not call generation, publication, verification, or source persistence.

## Verification

- `npm.cmd run test:claudia-hero-reconciliation`: PASS, 5/5.
- `node --check` on the script and test: PASS.
- `npm.cmd run build`: PASS, 31/31 routes.
- `git diff --check`: PASS.
- Repository-wide lint currently reports four pre-existing `no-explicit-any` errors in `components/partners-referrals-view.tsx`; this ticket does not modify that file. The configured ESLint ignore rules exclude `scripts/*.mjs`.

## Production operation

After merge and deployment, run from the deployed `app/web` directory:

1. Dry-run: `npm run maintenance:reconcile-claudia-heroes`
2. Review `previous`, `next`, and `changed`.
3. Apply: `npm run maintenance:reconcile-claudia-heroes -- --apply --confirm=claudia-calero`
4. Run dry-run again and require `changed: false`.

The script does not access production during build or tests. Production data remains unchanged until the explicit apply command is executed by an operator in the deployed container.

## Follow-up

No code follow-up is required if the post-apply Partners view reports both hero URLs and 100% onboarding completeness.
