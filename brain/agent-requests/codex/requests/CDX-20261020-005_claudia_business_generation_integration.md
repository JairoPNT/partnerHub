# CDX-20261020-005 — Complete Business generation integration

- Owner: Codex (backend integration).
- Scope: Integrate reviewed CDX-20261020-003 and CDX-20261020-004 so a Business package retains the selected master presentation and resolves its owner's legacy Product poster across generation and regeneration.
- Allowed: The two reviewed tickets' files, one combined local integration test, this request and its report; no unrelated source changes.
- Excluded: UI, templates, auth/policies, database, credentials, production content, deployment and provider operations.
- Dependencies: CDX-20261020-003 and CDX-20261020-004 independently approved after fixing their review findings.
- Parallel-safe with: CDX-20261020-002 operational discovery, which does not edit application code.
- Verification: Local combined generation/regeneration test, neighboring Business and publication-worker tests, full lint, production build, diff check and fresh integration review before PR/merge.
- Integration: One PR; Jairo handles deployment. Production source generation/publication stays tracked in CDX-20261020-002 and uses the current target and owner's commercial entitlement.
