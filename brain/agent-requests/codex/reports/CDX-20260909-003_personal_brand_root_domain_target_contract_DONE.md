# CDX-20260909-003 — Personal Brand root-domain target contract

## Outcome

Tasks 1 and 2 completed the backend route contract and pre-provider Personal
Brand apex gate. Final review corrected the route policy so an active requested
Product or Business subdomain serves its own ecosystem even when a
higher-priority ecosystem is active. Apex requests and inactive known
subdomains retain Personal Brand, Business, then Product fallback priority.
Task 3 operational memory now records the final passing verification state. No
frontend, provider, DNS, SFTP, Cloudflare, EasyPanel, deployment, publication,
PR, push, or merge action was performed.

## Verification evidence

- `node --experimental-strip-types --test server/services/partnerHostnameContract.test.ts` — **PASS**.
- `npm run test:partner-hostnames` — **PASS**.
- `npm run test:publication-target` — **PASS**.
- `npx eslint server/services/partnerHostnameContract.ts server/services/partnerHostnameContract.test.ts server/services/subdomainProvisioningService.ts server/services/subdomainProvisioningService.test.ts --no-ignore --max-warnings=0` — **PASS** with no findings.
- `git diff --check` — **PASS**.

The worktree's incomplete generated dependency state previously recorded in
`d21e92a5997428c02e95b98762060f9af3f49d83` (`docs: record dependency
verification remediation`) and then addressed by
`d390572ed4ad5221cb0a0048e8b55ad708d8b0f4` (`docs: correct personal brand
routing verification`) is historical. It is not a current CDX-003 verification
limitation. No network, credentials, provider, or production access was used.

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

Initial Task 3 documentation commit:
`e9ba98180d29cc93b2ac5ab03f49a8cb42853a4b` —
`docs: close personal brand root routing contract`.

Historical dependency-remediation record:
`d21e92a5997428c02e95b98762060f9af3f49d83` —
`docs: record dependency verification remediation`.

Historical verification-correction record:
`d390572ed4ad5221cb0a0048e8b55ad708d8b0f4` —
`docs: correct personal brand routing verification`.

## Self-review

- Documentation changes stay within CDX-003 operational-memory records.
- Verification results are reported exactly: all required checks pass, and the
  prior dependency blocker is identified as historical rather than current.
- No frontend or infrastructure files were changed.
