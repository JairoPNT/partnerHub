# CDX-20260825-007 — Dynamic Jairo Business provisioning recovery

## Owner

Codex — Backend Lead.

## Objective

Resume the retained `jairo-pinto-business` provisioning operation from the exact current target bytes, surface only a safe provider code and HTTP status if Hostinger rejects the DNS write, and complete the existing claim only after the target reaches `READY/PENDING`.

## Allowed scope

- Dynamically bind PREVIEW to the current target hash and retained original claim.
- Preserve the approved source, entitlement, owner, host and apex contracts.
- Call the existing in-process Hostinger-only provisioner only after explicit mode, confirmation and exact recovery plan hash.
- Preserve the retained claim for provider rejection or DNS/SSL propagation.
- Write the terminal provisioning journal and remove only the owned claim after `READY/PENDING` is verified.
- Return only normalized provider code and numeric HTTP status; never response bodies or secrets.

## Excluded scope

- No new target, entitlement, source or identity.
- No SFTP, package generation, publication, apex mutation, Brand/Product mutation or malware remediation.
- No fallback provider endpoints and no operator-supplied URLs.
- No automatic cleanup of foreign or drifted claims, targets or journals.

## Dependencies

- Original retained plan `7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf`.
- CDX-20260825-005: Hostinger DNS GET returned HTTP 200 and confirmed the expected record absent.
- CDX-20260825-006: Hostinger `/validate` accepted the exact DNS payload with HTTP 200.

## File boundaries

Allowed: provisioning service error metadata, the new recovery maintenance script and tests, Docker/package transport, and this request/report.

Excluded: UI/frontend, database schema, auth, payments, content generation and publication modules.

## Parallel safety

Not parallel-safe with another ticket editing provisioning service or Jairo Business provisioning state. Safe beside unrelated frontend or payment tickets.

