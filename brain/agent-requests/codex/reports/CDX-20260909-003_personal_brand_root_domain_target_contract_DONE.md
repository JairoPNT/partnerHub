# CDX-20260909-003 — Personal Brand root-domain target contract

## Outcome

Tasks 1 and 2 completed the backend route contract and pre-provider Personal
Brand apex gate. Task 3 performed the mandated focused verification and updated
operational memory. No frontend, provider, DNS, SFTP, Cloudflare, EasyPanel,
deployment, publication, PR, push, or merge action was performed.

## Verification evidence

- `npm run test:partner-hostnames` — **PASS**, 39 tests passed, 0 failed, after
  restoring the incomplete generated dependency tree through a temporary local
  junction to the complete official-checkout tree.
- `npm run test:publication-target` — **PASS**, 6 tests passed, 0 failed.
- `npx eslint server/services/partnerHostnameContract.ts server/services/partnerHostnameContract.test.ts server/services/subdomainProvisioningService.ts server/services/subdomainProvisioningService.test.ts --no-ignore --max-warnings=0` — **PASS** with process-local npm offline mode; no findings.
- `git diff --check` — **PASS**.

Root cause: the worktree's generated `node_modules` restore was interrupted;
`zod` lacked its package entrypoint and plain `npx` attempted network package
resolution. Minimal remediation: a temporary local junction to the complete
dependency tree already present in the official checkout, with npm offline
mode for the ESLint invocation. No network, credentials, provider, or
production access was used.

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

Prior documentation commit: `e9ba98180d29cc93b2ac5ab03f49a8cb42853a4b` —
`docs: close personal brand root routing contract`.

Authoritative verification correction: `d21e92a5997428c02e95b98762060f9af3f49d83` —
`docs: correct personal brand routing verification`. This correction changes
only the tracked closeout report; the SDD evidence remains an ignored artifact.

## Self-review

- Documentation changes stay within the four Task 3 files.
- Verification results are reported exactly, including the dependency blocker;
  no green aggregate-suite claim is made.
- No frontend or infrastructure files were changed.
