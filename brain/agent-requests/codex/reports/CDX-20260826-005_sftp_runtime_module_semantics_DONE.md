# CDX-20260826-005 — DONE

The SFTP maintenance runtime now preserves the native CommonJS semantics required by `ssh2` instead of bundling the library.

- A dedicated lockfile pins exactly `ssh2-sftp-client@12.1.1` and its required dependency closure.
- Docker installs it with development and optional packages omitted and install scripts disabled.
- The dependency tree is isolated at `/app/scripts/node_modules`, so it neither depends on nor overlays the Next.js standalone runtime.
- The original maintenance modules and exact direct-execution guards are restored.
- Image build runs a non-connecting smoke test that loads and instantiates the real client; output contains no secret or provider data.
- CDX-004 is marked superseded in operational memory.

Verification:

- Isolated runtime install: 14 packages, 0 reported vulnerabilities; smoke PASS with `providerCallsMade:false`.
- Runtime packaging contract: PASS 1/1.
- SFTP capability probe: PASS 9/9.
- Guarded ecosystem publication: PASS 18/18.
- App-owned Jairo capability PREVIEW: PASS 5/5.
- Focused ESLint: PASS, zero warnings.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.

Production continuation:

- Both failed PROBE attempts stopped during module import/initialization before SFTP connection or remote mutation.
- The existing manifest and reviewed plan hash remain unchanged.
- After merge/deploy, repeat PREVIEW and require the same `c7bed2e...` hash before reusing the existing explicit PROBE authorization.

Branch: `codex/CDX-20260826-005-sftp-runtime-module-semantics`.
