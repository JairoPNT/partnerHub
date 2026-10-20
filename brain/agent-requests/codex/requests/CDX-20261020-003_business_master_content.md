# CDX-20261020-003 — Preserve Business master content during generation

- Owner: Codex Backend Lead.
- Scope: Partner Business generation and regeneration retain presentation sections from the selected local master while preserving partner identity, contact and analytics.
- Allowed: productPageGenerationService.ts; uniquely named Business master content helper and regression test; this request and matching report.
- Excluded: frontend/templates, poster correlation service, authentication, routes, jobs, providers, environment and production state.
- Dependencies: PR #209 merged; local master refresh completed by operator.
- Parallel-safe with: CDX-20261020-004 (Product poster correlation).
- Integration: orchestrator integrates this commit with CDX-004, performs independent review and final build; no provider actions or deploy by this task.
- Verification: real generator -> saved source -> regeneration; canonical sections and VSL survive, partner WhatsApp/identity/analytics win, Product unchanged, invalid master fails before existing output removal.
