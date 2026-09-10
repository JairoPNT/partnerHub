# CDX-20260826-002 — DONE

Implemented one app-owned command that prepares and runs only the Jairo Business SFTP capability PREVIEW.

- Validates the exact PublishingTarget v2 identity and `READY/PENDING` state.
- Derives target hash, remote root, parent and four isolated sibling paths.
- Creates token/canary and manifest locally with restrictive permissions and atomic directory rename.
- Reuses only an exact manifest-only input directory; staging residue or foreign contents block.
- PREVIEW never creates an SFTP adapter or provider call.
- Output omits canary, raw username and password; it returns only the existing non-secret plan binding.
- PROBE remains a separate, explicitly authorized step.

Verification:

- App-owned preparation/PREVIEW: PASS 4/4.
- SFTP capability probe regression: PASS 9/9.
- Guarded publication compatibility: PASS 18/18.
- Focused ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.

Branch: `codex/CDX-20260826-002-sftp-capability-preview`.

No SFTP connection, provider call, remote mutation, capability PROBE or publication was executed from this ticket.
