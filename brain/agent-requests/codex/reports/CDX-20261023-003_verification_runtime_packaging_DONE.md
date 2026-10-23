# CDX-20261023-003 — Runtime/packaging verification

- Request ID: CDX-20261023-003
- Owner: Codex (infrastructure tests)
- Branch: `codex/CDX-20261023-003-verification-runtime-packaging`
- Source/request commit: `1733f35d0ba4e0ebb298827fbd361e7eb1d9850a`
- PR/push/merge: none; source frozen for controller review and integration.

## Scope and cause

Only `app/web/scripts/business-consent-cutover-runtime-packaging.test.mjs` and this ticket's request/report changed. No production runtime, builder, guard, template, pin, measurement, dependency, Docker, or customer asset was modified.

Five of six requested script families passed with the explicit Node 20 environment before any edit. The sixth had two fixture failures: Windows checkout CRLF staging bytes differed from the reviewed Git LF blobs, and the local Next standalone build traced the shared dependency directory as an external Windows junction. The unchanged assembler correctly rejected that junction. The test now compares the committed staging Git blobs against the pinned reviewed blobs, writes those exact committed bytes only into disposable fixtures, and, on Windows, materializes the full dependency tree into a private standalone copy only after proving the junction target equals this worktree's read-only `app/web/node_modules` target. The unchanged production assembler and inventory guard then inspect regular files; no symlink or byte-identity assertion was suppressed. The test's disposable SFTP dependency stage now copies packages already present under the matching lockfile records instead of invoking `npm ci`.

## Exact local setup

Working directory for commands: `C:\Users\jairo\.codex\worktrees\verification-runtime-packaging\PartnerHub\app\web`. Main runner: Node `v24.16.0` (needed for TS-stripping tests). Child executable: `C:\Users\jairo\.codex\worktrees\business-paid-traffic-followups\PartnerHub\.local-secrets\tooling\node20\node-v20.20.2-win-x64\node.exe`, verified `v20.20.2`, SHA-256 `56C1520EE33B801E8BDB92FB321CF2E98529735B6D12BD4A2A6DEC0AC0BAB937`.

```powershell
$env:BUSINESS_CUTOVER_TEST_NODE20='C:\Users\jairo\.codex\worktrees\business-paid-traffic-followups\PartnerHub\.local-secrets\tooling\node20\node-v20.20.2-win-x64\node.exe'
$env:PRODUCT_RECONCILE_NODE20=$env:BUSINESS_CUTOVER_TEST_NODE20
npm.cmd run build -- --webpack
npm.cmd run test:product-destination-reconcile-packaging
npm.cmd run test:jairo-business-master-package-drift-recovery
npm.cmd run test:business-master-runtime-packaging
npm.cmd run test:business-consent-master-migration
npm.cmd run test:business-consent-cutover-runtime
npm.cmd run test:business-cutover-runtime-packaging
```

The default `npm.cmd run build` exited 1: Turbopack could not resolve the out-of-worktree `node_modules` junction. The owned `npm.cmd run build -- --webpack` prerequisite exited 0 and produced `.next/standalone`; it warned about inferred workspace root, an unavailable optional `sshcrypto.node`, and 27 trace files not included in standalone output. No install or Docker was needed for the final run. The initial unedited test itself invoked `npm ci` inside its disposable SFTP fixture; that behavior was removed before the final green run. No persistent dependency tree or lockfile changed.

## RED/GREEN evidence

| Script | Final observed exit | Tests / passed / failed / skipped |
| --- | ---: | --- |
| `test:product-destination-reconcile-packaging` | 0 | 58 / 58 / 0 / 0 |
| `test:jairo-business-master-package-drift-recovery` | 0 | 50 / 50 / 0 / 0 |
| `test:business-master-runtime-packaging` | 0 | 4 / 4 / 0 / 0 |
| `test:business-consent-master-migration` | 0 | 121 / 121 / 0 / 0 |
| `test:business-consent-cutover-runtime` | 0 | 39 / 37 / 0 / 2 |
| `test:business-cutover-runtime-packaging` | 0 | 4 / 4 / 0 / 0 |

The first, second, third, fourth, and sixth script results were captured with both Node 20 variables set before the test-only edit; their files did not change. The sixth-family RED run was exit 1, 35 pass/2 fail/2 skipped. A candidate run that accidentally omitted the Node 20 variables was exit 1 (setup error), and the first fully configured candidate exceeded its 300 s Windows fixture timeout (36 pass/0 fail/1 cancelled/2 skipped). The final configured run allowed 600 s for full 750 MB junction materialization, finished in 385 s, and inventoried 30,177 regular files with Node 20 bundle import smoke and no provider calls. The two skips are pre-existing native POSIX mode/owner checks unavailable on Windows; native file-symlink `EPERM` diagnostic paths are not claimed as native-link passes.

Complete private logs: `.superpowers/sdd/CDX-20261023-003/` (`build.log`, `build-webpack.log`, all six `test-*.red.log` files, and the three consent-cutover candidate logs). Historical RED reference: `C:\Users\jairo\.codex\worktrees\master-sites-business-dashboard\PartnerHub\.superpowers\sdd\2026-10-20-business-master-sites-manual-delivery\script-checks\`.

## Self-review, risks, handoff

`node --check` and test-file diff whitespace check passed. The production assembler, exact Git byte comparison, symlink/ownership rejection, no-effects-before-barrier assertions, and required real Node 20 child execution remain intact. Only the assigned test file changed in source. A pre-existing trailing blank line in the supplied request triggered Git's staged whitespace warning; it was not a source change.

The Windows webpack standalone trace warning and two POSIX-only skips remain platform limitations, not production-readiness claims. No customer, hosting, DNS, SFTP, payment, campaign, or cutover operation was performed. Controller owns full 76-family verification, Linux/Node 20 build or Docker packaging, review, and integration under its separate ticket. No CDX-003 scope expansion is required; integration verification remains the follow-up.
