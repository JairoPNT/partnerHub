# CDX-20261020-012 — durable manual Business operation store

- Owner: Codex Backend Lead. Status: implemented; independent review required before 010 consumes it.
- Outcome: independent persistence slice of approved CDX-20261020-010; no behavior or architecture expansion.
- Base: `309f394afd9c15d65643099464c8083bf863dc13`.
- Branch: `codex/CDX-20261020-012-master-sites-operation-store`.
- Allowed: new `app/web/server/services/masterSitesBusinessOperationStore.ts` and `.test.ts`, dedicated `app/web/scripts/master-sites-business-operation-store-child.mjs`, this request and matching report.
- Excluded: all other source, DTO, UI, auth, provider, source/package/job services, environment, infrastructure, migrations, production.
- Dependencies: approved design/plan CDX-20261020-006; frozen DTO 007 and merged coordination 009. Commands 010 consume only after independent review.
- Parallel-safe: preview/input corrections 008; Antigravity AGR-20261020-001. Commands 010 no longer own store files.
- Model: assigned engineering model; additional verification for filesystem durability, isolation and cross-process concurrency. No child agents.
- Integration: file-backed immutable actor/action/partner/site/template/revision/updateExisting binding; exclusive create; monotonic CAS checkpoints; hash-only pins and bounded validated result. No automatic orphan recovery or side-effect recovery claims.

Verification: TDD with real temporary filesystem and independent Node children; safe corrupt/symlink/unknown-field rejection, owned cleanup, immutable binding, cloned reads, atomic exposure and stale CAS; exact lint and local build. No broad baseline repairs, push/merge or external writes.

Controller clarification: invalid nonliteral template is safe INVALID (the literal is validated before paths); only valid but different binding values produce CONFLICT. There is no second valid template in this scope.
