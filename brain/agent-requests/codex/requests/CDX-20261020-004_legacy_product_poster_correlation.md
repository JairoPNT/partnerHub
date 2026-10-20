# CDX-20261020-004 — Legacy Product poster correlation

- Owner: Codex, backend lead; balanced implementation, tenant-isolation review required.
- Scope: Resolve a Business VSL poster from its owner's existing legacy Product source when no Product v2 target exists.
- Allowed: `businessProductHeroCorrelationService.ts`, uniquely named legacy correlation tests/helpers, this request/report.
- Excluded: generation service, templates/UI, package scripts, auth/providers/environment, production data, Product/apex writes.
- Dependencies: existing Business target must bind its immutable ownerKey to an activation lead.
- Parallel-safe with: CDX-20261020-003 (Business configuration generation, separately owned).
- Integration: preserve normal v2 Product correlation; fallback requires authoritative lead.siteId, explicit PRODUCT identity and matching assigned domain. Ambiguous or foreign inventory fails closed. Main orchestrator owns PR, independent review and deployment.
- Verification: failing regression first; real temporary files; normal/legacy correlation, domain/owner/source mismatch, ambiguous inventory; lint and focused neighboring suites.
