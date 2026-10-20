# CDX-20261020-012 — durable Business operation store

## Status and scope

Implemented locally; **independent review required before CDX-20261020-010 consumes this contract**. This is only the durable-store slice of the approved manual Business task, not the complete delivery flow. No provider, production, UI, auth, source/package/job, infrastructure, dependency or schema changes; no push, PR or merge.

- Branch: `codex/CDX-20261020-012-master-sites-operation-store`.
- Base: `309f394afd9c15d65643099464c8083bf863dc13`.
- Implementation commit: `80bcccb8e605c9fbdefaba4e1979a4f3b35d8d0e`.
- Report commit: the subsequent documentation-only commit on this branch; exact HEAD is supplied in the controller handoff.
- Owner: Codex Backend Lead; assigned engineering model, extra filesystem/isolation verification; no subagents.
- Parallel-safe with 008 preview/input corrections and AGR-001 frontend. 010 owns command/routes and must not edit these store files.

Files added: `app/web/server/services/masterSitesBusinessOperationStore.ts`, corresponding `.test.ts`, `app/web/scripts/master-sites-business-operation-store-child.mjs`, own request 012 and this report. Local controller SDD report is outside the implementation checkout and is not committed.

## Frozen exports for 010

Runtime exports:

```ts
createMasterSitesBusinessOperationStore(options?: { directory?: string }): MasterSitesBusinessOperationStore

interface MasterSitesBusinessOperationStore {
  get(requestId: string): Promise<MasterSitesBusinessOperation | null>;
  create(binding: unknown): Promise<{ operation: MasterSitesBusinessOperation; created: boolean }>;
  checkpoint(requestId: string, expectedVersion: number, patch: unknown): Promise<MasterSitesBusinessOperation>;
}

class MasterSitesBusinessOperationStoreError extends Error {
  readonly code: MasterSitesBusinessOperationStoreErrorCode;
  readonly retryable: boolean; // true ONLY for BUSY
  constructor(code: MasterSitesBusinessOperationStoreErrorCode);
}
```

Exported types: `MasterSitesBusinessOperationBinding`, `MasterSitesBusinessOperationPhase`, `MasterSitesBusinessOperationPins`, `MasterSitesBusinessOperationPatch`, `MasterSitesBusinessOperation`, `MasterSitesBusinessOperationStoreErrorCode`, and interface `MasterSitesBusinessOperationStore`.

`create` and `checkpoint` intentionally accept unknown so every caller's runtime payload is strictly checked rather than trusting TypeScript casts. Use the exported binding/patch types in the internal command service. Only server-created values belong here; never supply directory, actor hash or authoritative pins from HTTP.

Binding, all fields required:

```ts
{
  requestId: string;        // canonical lowercase UUID, also operationId
  actorHash: string;        // lowercase hex64, no raw JWT/email
  action: "PREPARE_TARGET" | "PUBLISH";
  activationLeadId: string; // canonical lowercase UUID
  siteId: string;           // canonical lowercase slug ending -business, <=128 chars
  templateId: "ganomaster-business";
  expectedRevision: string; // lowercase hex64
  updateExisting: boolean; // explicit, including false for PREPARE_TARGET
}
```

Record: `{schemaVersion:1, operationId, binding, version, phase, createdAt, updatedAt, pins, result}`. Initial state is version **0**, phase `PREPARED`, empty pins, null result; identical replay returns it with `created:false`. No binding field can change in a replay; every valid changed actor/action/partner/site/revision/updateExisting conflicts without a write. Controller confirmed: a nonliteral template is INVALID, not CONFLICT, because there is no other valid template and validation precedes path construction.

Phase union: `PREPARED | PREPARING_TARGET | TARGET_PREPARED | GENERATING | GENERATED | ENQUEUEING | ENQUEUED | COMPLETE | RETRY_REQUIRED`.

Patch: `{phase?: Phase, pins?: Pins, result?: SafeCommandResult|null}`, strict with at least one supplied defined property. Supplied pins **merge**; omitted phase/result remain unchanged. Pin fields: `sourceHash`, `targetHash`, `masterPackageHash`, `packageHash`, `generationInputHash`, `jobId`, `reviewedRevision`, each lowercase hex64 when present. Explicit undefined pin values cannot erase an existing recovery pin. No immutable/unknown fields. Version increments once per successful checkpoint; stale or missing operation conflicts. createdAt/binding are preserved; updatedAt cannot move backward. The store validates phase membership but does not decide the command state machine or whether a recovery pin is still current.

Result uses the shared `masterSitesBusinessCommandResultSchema`, narrowed at storage to this operation's exact operationId/activationLeadId/siteId, canonical `negocio.<domain>` hostname or null, <=32 safe-code reasons, and safe job DTO (bounded attemptCount). A present result cannot have a null/different siteId. Every object is strict. Record bytes are capped at 16 KiB; input identifiers/hashes, reason codes, site/host length, counters and timestamps are bounded. No arbitrary content, credentials, onboarding, provider payloads, paths, raw exceptions, JWTs or emails are stored. Returned records are freshly validated/cloned, never shared mutable state.

Safe codes (class `.message` equals `.code`, no raw cause): `MASTER_SITES_OPERATION_INVALID`, `MASTER_SITES_OPERATION_CONFLICT`, `MASTER_SITES_OPERATION_BUSY`, `MASTER_SITES_OPERATION_CORRUPT`, `MASTER_SITES_OPERATION_STORAGE_ERROR`, `MASTER_SITES_OPERATION_OWNERSHIP_LOST`. Route mapping is 010's responsibility. BUSY means a fail-fast contention/recovery gate, not permission to steal/retry effects automatically.

## Storage, concurrency and recovery boundaries

Default directory: `<PRODUCT_PAGE_OUTPUT_DIR or /data/generated-sites>/.master-sites-business-operations`. Explicit `directory` is the full trusted store directory, not an output-root option. All instances must share the same filesystem/directory. Pure get does not initialize directories and returns null only for ENOENT; corruption, wrong identity/schema, truncated/oversized JSON, permission errors, symlink/non-file/hardlinked records fail closed. Canonical UUID validation precedes record path construction; existing root ancestors are checked against symlinks/junctions before creating directories. Final-file reads use lstat, open/no-follow where supported, file-identity checks and bounded reads.

Short per-request `<requestId>.lock` directory claims serialize create/checkpoint across processes, with exclusive `owner.json` creation, random internal token, inode/device and exact marker verification before commit/release. No provider/generation/job work occurs while held. No TTL, PID check, lease expiry, lock stealing, reentrance or hidden recovery endpoint exists. Existing incomplete/malformed/foreign/orphan claims remain BUSY. Replaced/malformed owned markers produce OWNERSHIP_LOST and are not removed. Cleanup is non-recursive and ownership-scoped.

Records are written to exclusive same-directory temporary files, fsynced, closed and atomically renamed; POSIX also fsyncs the parent directory. Windows does not support opening a directory for that sync, so local tests establish process-crash/atomic-rename behavior, not power-loss/storage-controller guarantees. Failed temporary writes and pre-rename replacement errors preserve the complete prior JSON and release the owned claim; temporary cleanup checks file identity. Readers never consume a temp file. A failure after the rename/commit boundary (for example lost ownership or directory-sync error) can leave a complete newer record despite an error response. Re-read and validate the operation, never infer rollback from an exception.

The OS/shared filesystem is trusted against arbitrary privileged path substitution; the module is not a filesystem sandbox or distributed lock for unshared volumes. 010 must hold the reviewed **site** coordinator across external effects, taking these short operation-store locks only during checkpoint calls; do not run provider/source/job work inside a store lock. This store does not claim site ownership or read/write jobs/journals.

Before each external effect, 010 must durably checkpoint the intended phase/pins; on resume it must revalidate actual owner/source/target/master/input/job pins and entitlement, then decide whether its effect exists exactly or requires explicit review. Persistence alone does not prove whether a generation/provision/enqueue effect happened. A killed process before rename leaves an orphan/temp and no exposed partial initial record. Recovery requires explicitly establishing that all possible owners have stopped, preserving/reconciling exact operation and side-effect evidence, and separately authorizing removal of that exact orphan; age, absent/corrupt marker or dead-looking PID is not proof. This ticket adds no recovery delete action.

## TDD and verification evidence

RED:

1. API scaffold only: initial durable-replay test failed `NOT_IMPLEMENTED`.
2. Twelve required behavioral tests failed before persistence/validation/CAS/ownership existed: missing rejections, zero successful concurrent creates, no persisted operation, unimplemented writes.
3. Narrow test `failed temporary write ...` failed because a failed write left its owned `.tmp`; cleanup moved around the entire write/commit lifecycle and the test passed.
4. Narrow test `explicit undefined pins ...` failed with missing expected rejection; strict defined hash-pin validation fixed the erasure. No production changes were made for the additional passing hardlink/default-root/paused-child characterization tests.

Final GREEN from `app/web`:

```powershell
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/masterSitesBusinessOperationStore.test.ts shared/master-sites-business-contract.test.ts server/services/businessPublicationSiteCoordinator.test.ts
npx eslint server/services/masterSitesBusinessOperationStore.ts server/services/masterSitesBusinessOperationStore.test.ts --max-warnings=0
npm run build
git diff --check
```

- **26/26 passed**: 17 store, 5 coordinator, 4 DTO. Real temporary files and independent Node processes, IPC start/rename/release barriers, explicit process kill, no timing sleeps. Service-instance and multiprocess create/CAS races allow one creator/advancer only. Independent requests proceed beside live/orphan claims. Old/new reader visibility, unchanged bytes after failure/conflict, result identity, corrupt and symlink/hardlink protection, clones and owned cleanup covered.
- Exact ESLint: **exit 0**. Initial `no-unsafe-finally` lint finding was corrected by moving owned-temp cleanup into a helper; no suppression.
- Final build: **exit 0**, TypeScript plus **39/39 static pages**. Earlier local build also succeeded; final run follows the pin-validation fix.
- Diff check: **exit 0**; no unrelated tracked modifications.
- Existing warnings retained: Node experimental loader/module-type notices, Next multiple-lockfile root inference and two broad NFT tracing warnings. No config changes/suppression.
- No aggregate-suite claim. Controller explicitly bounded verification to these focused suites/lint/build; the nine previously reproduced legacy failures from 009 were not rerun, changed or repaired. Full integration remains 011's gate.

Self-review checked scope, immutable-field enforcement, compare-and-swap, result binding, safe errors, fail-closed ownership, rename boundary and secret/path exclusions. Independent review is still pending; implementation author review is not a substitute. Follow-up required: independent 012 review, 010 command integration and 011 end-to-end/security review. No production delivery is authorized or claimed by this report.

## Independent-review P2 remediation — concurrent reader/rename

Review of `360760a0335f662c3ad2201436723afd7d1825c1` identified one P2: a reader could lstat the complete old record, then a legitimate checkpoint atomically rename a complete new record before the reader opened the path. The combined stat/inode guard classified the healthy new inode as non-retryable CORRUPT. Existing before/after-rename tests did not span this precise lstat/open interval.

Reproduced before changing implementation with `checkpoint rename between reader lstat and open returns retryable BUSY, not false corruption`. The test intercepts the reader's real fs.open after lstat, runs a **real second store checkpoint** (write/fsync/rename/version 1), then opens the new inode. RED: actual CORRUPT versus expected BUSY. A separate marker replacement test was already green and confirms that the same inode-replacement pattern for `owner.json` is ownership tampering, not normal contention.

Fix: final-file type, hardlink count and size guards still run first; a record inode mismatch now fails closed with **MASTER_SITES_OPERATION_BUSY**, retryable true, accepting neither snapshot. A caller may explicitly re-read; the module does not loop, retry side effects or claim that corruption is repaired. Owner-marker mismatch retains **MASTER_SITES_OPERATION_OWNERSHIP_LOST**, retryable false; the replaced marker/claim remains untouched. The subsequent unhooked get returns the valid version 1; ownership-tampering scenario leaves version 0 and its closed claim. UUID, symlink/no-follow, file identity, bounded read, record/schema/result identity and all immutable/CAS guards remain in force. No exports or signatures changed. Consequently, `get` can return the existing typed BUSY code during atomic replacement, not only a record/null or permanent data/storage error.

Verification after fix (same exact commands listed above): **28/28** focused tests (19 store + 5 coordinator + 4 DTO), exact ESLint exit 0, `git diff --check` exit 0. Fresh `npm run build` exit 0, TypeScript plus **39/39 static pages**. Existing multiple-lockfile warning and one broad NFT tracing warning remained; Node loader/module-type notices unchanged. No aggregate sweep/baseline repairs. Delta against reviewed HEAD: store 6 changed lines (one removed), two deterministic regression/ownership tests (54 added lines), and this report. Local controller SDD report updated. Exact remediation commit is supplied in the controller handoff; independent reviewer disposition remains required. No push, merge, provider or production operation.
