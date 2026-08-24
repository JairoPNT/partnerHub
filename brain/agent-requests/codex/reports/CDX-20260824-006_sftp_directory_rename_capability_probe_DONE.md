# CDX-20260824-006 — SFTP directory rename capability probe — DONE

## Request ID

`CDX-20260824-006`

## Outcome

Implemented a fail-closed `PREVIEW` and a separately gated SFTP capability
probe. No SFTP connection, provider call, EasyPanel command, deploy or
production mutation was performed while implementing or testing this ticket.

`PREVIEW` reads only the local manifest and PublishingTarget v2. It does not
instantiate the SFTP adapter. The destructive probe is unreachable unless the
caller supplies the exact mode, confirmation and reviewed `planHash`.

## Contract implemented

- pins the PublishingTarget hash, identity, `remoteRoot`, exact parent, four
  derived temporary paths, connection identity, host-key fingerprint, canary
  hash and TTL in `planMaterial`/`planHash`;
- constrains the claim, stage, test destination and backup to unique hidden
  tokenized siblings under the exact parent of `target.remoteRoot`;
- rejects the real target, its descendants, ancestors, prefix ambiguity,
  traversal, foreign residue and incomplete/stale/active claims;
- uses the CDX-005 adapter so the pinned SHA-256 host key is verified during the
  SSH handshake;
- revalidates claim ownership before every remote mutation and cleanup;
- proves write/readback, sibling rename, backup/restore and final readback with
  one cryptographically random 32-byte canary supplied by the manifest;
- verifies the real target inventory is byte/hash identical before and after;
- removes all owned remote artifacts before emitting capability evidence;
- writes `sftp-capability.json` atomically into an explicit, pre-existing local
  directory with mode `0600`, rejects output collisions and returns its hash;
- emits schema/probe v1 evidence compatible with the CDX-005 capability
  consumer, with an explicit TTL between 60 and 3600 seconds.

## Runtime inputs (redacted)

The manifest must be generated outside Git with a UUIDv4 probe token and a
cryptographically random canary, for example `crypto.randomBytes(32)` or
`openssl rand -hex 32`. It contains one allowlisted entry with:

- the approved owner/site/ecosystem/domain/host identity;
- `expectedTargetHash`;
- exact `remoteRoot` and its canonical parent;
- exact derived claim/stage/destination/backup sibling paths;
- random `probeToken` and `canaryHex`;
- `ttlSeconds <= 3600`.

Secrets remain environment-only and are never copied into the plan,
capability, stdout or repository. The output directory must be explicit,
pre-existing, outside Git and dedicated to this evidence.

## Future command gates (parameterized; not executed)

Preview:

```sh
npm run maintenance:sftp-directory-rename-capability-probe -- \
  --manifest="$MANIFEST_PATH" \
  --mode=PREVIEW
```

Only after review of that stdout and separate authorization:

```sh
npm run maintenance:sftp-directory-rename-capability-probe -- \
  --manifest="$MANIFEST_PATH" \
  --output-dir="$CAPABILITY_OUTPUT_DIRECTORY" \
  --mode=PROBE_SFTP_DIRECTORY_RENAME_CAPABILITY \
  --confirm=RUN_ALLOWLISTED_SFTP_RENAME_PROBE \
  --expected-plan-hash="$REVIEWED_PLAN_HASH"
```

These commands do not authorize execution. A real probe is intentionally
destructive only within its four owned temporary siblings and still requires
post-merge/deploy authorization.

## Files

- `app/web/scripts/sftp-directory-rename-capability-probe.mjs`
- `app/web/scripts/sftp-directory-rename-capability-probe.test.mjs`
- `app/web/package.json`
- `Dockerfile`
- request and this report under `brain/agent-requests/codex/`

## Verification

- capability probe: 9/9 PASS;
- guarded publication regression (CDX-005): 18/18 PASS;
- publishing preflight regression (CDX-004): 7/7 PASS;
- ESLint `--no-ignore` on both new runtime/test files: PASS, zero warnings;
- production build: PASS (existing Turbopack trace warning only);
- repository-wide ESLint: baseline frontend-only failure in excluded files
  `components/partners-referrals-view.tsx`,
  `components/personal-brand-blocks-view.tsx` and
  `lib/ecosystem-contracts.ts`; no backend/probe finding;
- `git diff --check`: PASS.

## Risks and pending authorization

- SFTP directory rename is recoverable, not transactional/atomic; this ticket
  only produces short-lived capability evidence and does not publish a site.
- A provider-specific behavior can only be proven by the separately authorized
  post-deploy real probe.
- Ownership loss or cleanup residue deliberately leaves an auditable blocker;
  foreign artifacts are never removed automatically.
- No PR, merge, deploy or real probe is authorized by this report.
