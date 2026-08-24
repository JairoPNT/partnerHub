# CDX-20260824-006 — SFTP directory rename capability probe

## Status

REQUEST ONLY. Implementation and real execution are not authorized.

## Owner and dependency

Codex Backend. Depends on the guarded publication contract from CDX-005 being
merged and deployed. Implementation must use a separate branch/worktree and
must not edit overlapping CDX-005 files while that ticket is active.

## Objective

Produce short-lived, non-portable evidence that the configured SFTP server can
perform and verifiably restore the recoverable sibling-directory rename sequence
required by the guarded publisher. The probe is explicitly destructive only
inside its own three allowlisted, tokenized temporary siblings.

## Mandatory PREVIEW

Before connecting or writing remotely, emit a local `PREVIEW`, `changed:false`
plan containing:

- normalized SFTP host and port;
- verified SHA-256 host-key fingerprint;
- non-secret username identity hash;
- exact PublishingTarget v2 `remoteRoot` and canonical parent directory;
- random owner/probe token;
- the exact three temporary sibling paths for stage, destination and backup;
- canary payload hash, schema/probe versions, TTL and cleanup plan.

PREVIEW must reject path traversal, parent mismatch, target state drift,
non-sibling paths, collisions/residue, missing host-key pin, invalid TTL and any
path equal to or nested inside the real `target.remoteRoot`.

## Destructive probe contract

Real probe execution requires a separate explicit authorization after merge and
deploy. Under an exclusive, separately tokenized ownership claim it may only:

1. create the three planned temporary siblings under the exact parent of
   `target.remoteRoot`;
2. create a cryptographically random canary payload in its owned stage;
3. read it back and verify its hash;
4. rename owned stage to owned probe destination and read back;
5. rename owned destination to owned backup, restore it to owned destination,
   and read back again;
6. remove only its owned probe paths and claim after final verification.

It must never write, rename, remove, traverse or otherwise mutate the real
`target.remoteRoot`, Brand/Product targets, apex, or any non-owned path.

## Ownership, residue and failure

- Claim acquisition must be exclusive and persist an owner token.
- Every remote mutation and cleanup phase must recheck ownership.
- Cleanup may touch only paths whose exact token and allowlist match the plan.
- Ownership loss fails closed and leaves foreign artifacts untouched.
- Cleanup failure or any residual owned path must be reported explicitly as a
  blocking result; residues must never be hidden or silently treated as success.
- A rerun with residue, incomplete/stale claim, path drift or evidence drift
  blocks pending audit/manual disposition.

## Capability artifact

Only a fully successful probe with verified cleanup may emit
`sftp-capability.json` plus its SHA-256. It must contain:

- `schemaVersion: 1`;
- `probeVersion: partnerhub-sftp-sibling-rename-v1`;
- status `VERIFIED`;
- normalized host, port, verified host-key fingerprint and username hash;
- exact remoteRoot and canonical parent scope;
- the three tokenized sibling probe paths;
- evidence for canary creation/readback, stage-to-destination rename,
  destination-to-backup/restore and final readback;
- `sameFilesystemDirectoryRename: true` and
  `backupRestoreReadback: true` only when directly demonstrated;
- verified timestamp, short explicit TTL no longer than one hour, probe token,
  canary hash and cleanup verification.

The artifact must contain no password, private key, token, cookie or other
secret. Future/fake/partial evidence and an artifact emitted before cleanup are
invalid.

## Tests required before implementation approval

- PREVIEW makes no provider calls or writes.
- real target and descendants are structurally unreachable by mutations;
- collision/residue and incomplete/stale/foreign claims block;
- host-key mismatch blocks before SFTP operations;
- each injected failure in create/readback/rename/restore/cleanup is explicit;
- ownership loss never removes foreign paths;
- only successful full sequence plus cleanup emits capability evidence;
- artifact binding, TTL and hash satisfy the CDX-005 consumer contract.

## Exclusions

No DNS, Hostinger API, provisioning, publication, source generation, source or
PublishingTarget mutation, UI, Payments, Landing Builder, redirects, deploy or
production execution in the implementation ticket.

## Authorization gates

1. Orchestrator audit of the implementation and tests.
2. PR/merge/deploy authorization.
3. Separate explicit authorization for the destructive SFTP probe using the
   reviewed PREVIEW/planHash.

No gate implies authorization for the next one.
