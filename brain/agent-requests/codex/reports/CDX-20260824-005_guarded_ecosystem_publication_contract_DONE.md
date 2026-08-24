# CDX-20260824-005 — Guarded ecosystem publication contract — DONE

## Result

Implemented a generic guarded publisher with a single compiled first allowlist
for Jairo Business. PREVIEW validates pinned source, package, target, protected
Brand/Product artifacts and SFTP capability evidence without network calls or
writes. APPLY is a distinct mode and remains unusable unless every gate passes.

The destination comes only from READY PublishingTarget v2 `remoteRoot`.
`HOSTINGER_SFTP_REMOTE_ROOT` is never read. Target provisioning state is checked
independently and is never interpreted as proof of publication. Provisioning
now leaves `publicationState=PENDING`; only the guarded publisher marks it READY
after public verification, and restores the pinned target on pre-journal failure.

## Transaction

1. Acquire exclusive sibling remote claim and persist owner token.
2. Repeat local preflight under the claim and validate expected remote state.
3. Upload every package file to owner-specific sibling staging.
4. Read back the complete remote inventory and compare its package hash.
5. Rename the previous destination to an owner-specific backup when present.
6. Rename staging to the destination and revalidate its complete hash.
7. Verify public HTTPS and the ecosystem-specific contract.
8. Recheck protected local artifacts and write the final local journal atomically.
9. Only after the journal, clean backup and claim. Cleanup failure never rolls
   back committed content.

Every mutating phase checks claim ownership. Ownership loss fails closed and
does not delete, restore or overwrite shared remote artifacts.

## Guarantee and dependency

The two directory renames are recoverable under ownership but are not an atomic
exchange; a short availability gap can exist. APPLY blocks unless a pinned
capability snapshot proves same-filesystem directory rename and backup restore
readback on the actual SFTP server. No such probe was executed in this ticket.

The evidence cannot be replayed across destinations. PREVIEW binds and hashes
schema/probe version, normalized SFTP host/port, SHA-256 host-key fingerprint,
hashed username, exact remoteRoot, canonical parent, three sibling probe paths,
verifiedAt and bounded TTL. Future/expired evidence and every identity/scope
mismatch block. The production adapter verifies the host key during SSH
handshake and fails closed when the configured fingerprint is unavailable.

The final publication-state commit has a second TOCTOU gate after remote install
and public verification. It requires the original target byte hash, identity,
READY provisioning, PENDING publication and exact remoteRoot, then rechecks
Brand/Product. Drift returns `TARGET_DRIFT_BEFORE_PUBLICATION_COMMIT`, preserves
the foreign target, restores the prior remote package under ownership and emits
no final journal.

## Files

- `app/web/scripts/guarded-ecosystem-publication.mjs`
- `app/web/scripts/guarded-ecosystem-publication.test.mjs`
- `app/web/server/services/subdomainProvisioningService.ts`
- `app/web/server/services/subdomainProvisioningService.test.ts`
- `app/web/package.json`
- `Dockerfile` (runtime packaging only)
- request/report

## Verification

- Guarded publication tests: PASS 18/18.
- Provisioning regression: PASS 11/11.
- Publication-target regression: PASS 6/6.
- Ecosystem generation regression: PASS 14/14.
- Focused ESLint with `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS (one pre-existing NFT tracing warning).
- `git diff --check`: PASS.

## Production state

No Hostinger, DNS, SFTP, HTTPS, EasyPanel, provisioning, generation, publication
or production write was executed. PR remains unopened.
