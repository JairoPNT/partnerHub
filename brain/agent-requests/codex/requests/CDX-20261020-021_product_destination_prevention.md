# CDX-20261020-021 — Prevent Product publications from reverting to apex

Owner: Codex backend. Status: INDEPENDENT REVIEW APPROVED for source ca1f1cf35911918e83455adc5349393e027ac457 after two P1 tenant-boundary fixes; ready for GitHub integration. No production deployment or runtime reconciliation performed. Report: ../reports/CDX-20261020-021_product_destination_prevention_DONE.md.

Goal: preserve the user-approved Producto canonical destination across later partner edits and publication. Hostinger cutover020 is live, but runtime sources still use apex and lack Product targets; do not declare PartnerHub reconciled.

Allowed areas: productPageLeadSyncService.ts and focused tests; publicationTargetResolver.ts and focused tests; minimal Product publisher call-site plumbing required to validate identity/root. One prevention outcome; separate branch/worktree and independent security/isolation review. No frontend, provider writes, commercial state, source-ID renames, Brand/Business behavior or master relocation. Exact additional file needs must be reported before editing them.

Use existing canonical hostname/master predicates. Preserve onboarding.domain as base domain; Product effective site.domain becomes producto.<base>. Missing, stale-host, apex-root, old-account or foreign-tenant Product destination must fail before SFTP/overwrite; no unsafe fallback to the root. Match trusted configured hosting root and provider-confirmed tenant root, not a URL from the client. Master Product uses its existing product.ganomaster.pro exception.

Dependencies: approved canonical routing contract; raw inventory from020. Parallel-safe with022 script planning/tests, but022 production APPLY waits reviewed021 deployment. No shared-file/production-output overlap.

Tests: partner edit cannot restore apex; canonical and www normalization; valid Product target succeeds; missing/foreign/apex/old-account destinations block before transport; master unchanged; Business/Brand unchanged. RED/GREEN, focused existing suites, lint/build, review. No runtime source or target mutation in this ticket.
