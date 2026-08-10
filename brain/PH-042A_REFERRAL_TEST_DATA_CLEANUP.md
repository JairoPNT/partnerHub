# PH-042A - Referral test-data cleanup

Status: Implementation ready; production execution pending
Date: 2026-08-10
Owner: Codex

## Authorized target

Remove referral relationships whose referring entrepreneur is the non-real test identity `jairo-pinto-test`:

- `jenny-varela` (`QUALIFIED`)
- `claudia-calero` (`CANCELLED`)
- `blanca-ruiz` (`CANCELLED`)

Also remove the invitation-code record assigned to `jairo-pinto-test`. Do not remove the three referred partners, their activation leads, sites, analytics, publishing history, or public pages.

## Safety design

The one-time maintenance command:

- defaults to dry-run;
- is hardcoded to `jairo-pinto-test`;
- requires `--apply --confirm=jairo-pinto-test` to mutate;
- backs up the complete original `codes.json` and `referrals.json` before writing;
- writes both remaining datasets atomically;
- reports only counts, referred site IDs, statuses, and backup location;
- leaves activation-lead and generated-site storage untouched.

## Production sequence

After merge and deployment:

1. Run dry-run:
   `node /app/scripts/cleanup-jairo-pinto-test-referrals.mjs`
2. Confirm exactly one code and the three authorized referral relationships are selected.
3. Run apply:
   `node /app/scripts/cleanup-jairo-pinto-test-referrals.mjs --apply --confirm=jairo-pinto-test`
4. Record the backup directory returned by the command.
5. Refresh `/partners` and verify the referral history and derived benefit summary no longer include `jairo-pinto-test`.
6. Confirm Jenny, Claudia, and Blanca remain present as partners.

Production execution is a separate controlled step and must stop if dry-run returns any other referred site ID.
