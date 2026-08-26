# CDX-20260826-004 — DONE

The production SFTP capability PROBE failure was traced to Docker runtime packaging: the runner copied the maintenance scripts but not the `ssh2-sftp-client` dependency graph. The failure occurred during module loading, before adapter creation, provider connection or remote mutation.

The guarded publisher and SFTP capability probe are now bundled as self-contained Node 20 ESM entrypoints during the existing builder stage. The bundles include the locked SFTP dependency graph, provide Node `require` compatibility for bundled CommonJS dependencies and replace the unbundled scripts in the runner without copying the full production dependency tree.

Direct-execution guards now remain correct after bundling: importing the guarded publisher inside the probe does not execute its CLI main, while each bundled entrypoint still executes exactly once when launched directly.

Verification:

- SFTP runtime packaging: PASS 1/1; both bundles build with no unresolved required npm package, run without workspace `node_modules`, and the probe CLI executes once.
- SFTP capability probe: PASS 9/9.
- Guarded ecosystem publication: PASS 18/18.
- App-owned Jairo SFTP capability PREVIEW: PASS 5/5.
- Focused ESLint: PASS, zero warnings.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.
- Docker daemon was unavailable locally; the packaging test reproduces the builder bundling and isolated runner execution. EasyPanel build/deploy remains the final container verification.

Production continuation:

- The existing manifest and reviewed PROBE plan remain unchanged; the failed attempt emitted no capability and made no provider call.
- After merge/deploy, rerun the previously authorized PROBE exactly once with plan hash `c7bed2e586cb2c065d6e204afed7fd47762a19859d5b510286c3fc716d106385`.
- If any residue or drift is reported, stop without cleanup or retry.

Branch: `codex/CDX-20260826-004-sftp-runtime-dependency-packaging`.

