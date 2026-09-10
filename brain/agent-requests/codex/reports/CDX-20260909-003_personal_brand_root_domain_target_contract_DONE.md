# CDX-20260909-003 — Personal Brand root-domain target contract

## Outcome

Tasks 1 and 2 completed the backend route contract and pre-provider Personal
Brand apex gate. Task 3 performed the mandated focused verification and updated
operational memory. No frontend, provider, DNS, SFTP, Cloudflare, EasyPanel,
deployment, publication, PR, push, or merge action was performed.

## Verification evidence

- `npm run test:partner-hostnames` — **BLOCKED by isolated dependency state**:
  14 tests passed; 2 test files failed at module loading because
  `node_modules/zod` was incomplete/missing its package entrypoint. No assertion
  failure was reported.
- `npm run test:publication-target` — **PASS**, 6 tests passed, 0 failed.
- `npx eslint server/services/partnerHostnameContract.ts server/services/partnerHostnameContract.test.ts server/services/subdomainProvisioningService.ts server/services/subdomainProvisioningService.test.ts --no-ignore --max-warnings=0` — **BLOCKED**; the isolated dependency install did not complete and `npx` could not start ESLint.
- `git diff --check` — **PASS**.

The worktree had no complete `node_modules` tree. A locked local dependency
restore was attempted without provider or production access, but it did not
complete in the available verification window. This is an environment
prerequisite, not a product-test failure.

## Changed files

- `brain/02_CURRENT_STATUS.md`
- `brain/03_NEXT_MISSION.md`
- `brain/LIVE_PROJECT_STATE.md`
- `brain/agent-requests/codex/reports/CDX-20260909-003_personal_brand_root_domain_target_contract_DONE.md`

## Scope and next boundary

The route policy is apex-only for Personal Brand, fixed-subdomain for Product
and Business, and fail-closed for unsupported labels. The next work must be a
separate guarded Personal Brand master-package/preview ticket. It may define
and validate an explicit apex remote root, but must not provision, create DNS,
obtain SFTP, publish, deploy, or mutate production without fresh review and
authorization.

## Commit

`6d859d74bb3290dc6156c8fcaf6488cf9e6b2153` — `docs: close personal brand root routing contract` (the final pre-report-metadata commit; the amended closeout retains this exact scoped diff).

## Self-review

- Documentation changes stay within the four Task 3 files.
- Verification results are reported exactly, including the dependency blocker;
  no green aggregate-suite claim is made.
- No frontend or infrastructure files were changed.
