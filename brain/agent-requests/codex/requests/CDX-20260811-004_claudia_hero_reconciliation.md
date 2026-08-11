# CDX-20260811-004 - Claudia hero reconciliation

- Owner: Codex
- Model tier: Balanced
- Scope: Reconcile Claudia Calero's already-saved product hero URLs into her activation onboarding record without generation or publication.
- Allowed files/modules: one focused maintenance script, its tests, `app/web/package.json`, and this ticket/report documentation.
- Excluded files/modules: frontend, product generation, publication, templates, domains, analytics, migrations, and every partner other than `claudia-calero`.
- Dependencies: `CDX-20260811-003` deployed and validated.
- Parallel-safe with: work that does not modify the maintenance scripts or activation/source JSON files.
- Integration notes: production execution is a separate, explicit operator step after deployment.

## Safety contract

- Default execution is dry-run.
- Apply requires both `--apply` and `--confirm=claudia-calero`.
- Read final heroes from `.sources/claudia-calero.json`.
- Require valid HTTPS desktop and mobile URLs and exactly one activation lead linked to `claudia-calero`.
- Change only `onboardingData.heroDesktopUrl`, `onboardingData.heroMobileUrl`, `onboardingUpdatedAt`, and `updatedAt`.
- Create a timestamped backup of `leads.json` before an effective write.
- Write atomically and remain idempotent.
- Do not regenerate, publish, verify, or modify the saved page source.

## Acceptance checks

- Dry-run reports the intended change without writing.
- Apply updates only the target lead and preserves all unrelated fields.
- Missing/duplicate leads and invalid heroes fail closed.
- Repeated apply is a no-op.
- Focused tests, production build, and `git diff --check` pass.
