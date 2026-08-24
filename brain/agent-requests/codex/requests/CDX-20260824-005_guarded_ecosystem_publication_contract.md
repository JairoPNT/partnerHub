# CDX-20260824-005 — Guarded ecosystem publication contract

## Owner and objective

Codex Backend. Provide a generic PREVIEW and separately guarded publication
transaction for one ecosystem/site/PublishingTarget v2. The first compiled
allowlist is only Jairo Business.

## Required contract

- READY v2 target; destination is exclusively its persisted `remoteRoot`.
- Never read or use `HOSTINGER_SFTP_REMOTE_ROOT` as a destination.
- Provisioning readiness is not publication readiness.
- PREVIEW is unchanged/read-only; APPLY requires mode, confirmation and planHash.
- Exclusive remote claim with owner token.
- Complete sibling staging package and remote hash readback before commit.
- Recoverable two-rename commit: destination to backup, staging to destination.
- Owner-only rollback before the final journal; never rollback post-journal.
- Journal and final-package validation provide sequential idempotency.
- Brand, Product and apex remain outside the mutation surface.

## Honest SFTP guarantee

SFTP does not expose an atomic directory exchange. The implementation therefore
does not claim an atomic swap: it has a brief interval between two same-filesystem
renames. APPLY is fail-closed unless a hash-pinned capability snapshot records
that the actual server supports directory rename plus backup restoration and
readback. Creating that evidence requires a separately authorized provider
capability gate; it is not executed by this ticket.

## Business verification

Before the final journal, verify HTTPS/public assets, Business config identity,
canonical host, MP4 VSL, source-derived poster, identical encoded-message
WhatsApp CTAs, and absence of Product purchase URLs.

## Exclusions

No provider calls or production execution during implementation/tests. No UI,
Payments, Landing Builder, redirects, Product/Brand mutation, DNS provisioning
or generalized onboarding automation.

## Release gate

No PR, deploy or production APPLY without a new orchestrator audit.
