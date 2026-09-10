# CDX-20260826-003 — DONE

The app-owned SFTP capability PREVIEW now creates only its fixed local input parent when absent, before creating the already-guarded staging directory.

- Existing staging/input collision behavior is unchanged.
- No provider or SFTP behavior changed.
- Production failure was pre-mutation: no staging, manifest or remote call was created.

Verification:

- App-owned capability PREVIEW: PASS 5/5, including absent-parent production regression.
- SFTP capability probe regression: PASS 9/9.
- Focused ESLint: PASS.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.

Branch: `codex/CDX-20260826-003-sftp-input-parent-bootstrap`.
