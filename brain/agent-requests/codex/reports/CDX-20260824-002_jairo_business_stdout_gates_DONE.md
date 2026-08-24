# CDX-20260824-002 — Jairo Business stdout gates — DONE

## Reviewed baseline

- Current `origin/main` was verified before authoring.
- CDX-017 is merged and its correction is closed productively.
- The follow-up inventory reported all six linked partners `COHERENT`, with no
  `CONFLICT` or `MISSING` rows.
- CDX-013/014/015 remain the controlling Business preview contracts.

This repository copy is deliberately redacted. Partner IDs, phone identifiers,
profile copy, authentication material and exact operator values are available
only in the restricted orchestrator response.

## Gate contract

All gates run from the deployed application directory and print only to stdout.
They must contain no redirection, file creation, snapshot persistence, manifest
creation or DRY_RUN invocation.

### Gate A — canonical runtime

Read the packaged Business config, calculate SHA-256 over its exact bytes,
compare it with `[EXPECTED_RUNTIME_SHA256]`, scan the approved forbidden-token
list, evaluate `CONFIG` in a constrained VM, and verify the BUSINESS ecosystem,
approved canonical media, empty direct registration URL and absence of demo
identity/URLs. Any mismatch stops the sequence.

### Gate B — activation snapshot preview

Read the activation store, require exactly one `[ACTIVATION_LEAD_ID]`, verify
`[OWNER_SITE_ID]`, and independently normalize the two authoritative WhatsApp
fields. Both must equal `[AUTHORIZED_WA_DIGITS]`; the display phone is checked
against its separately authorized representation but remains non-authoritative.

Print a privacy-minimized snapshot containing only fields consumed by CDX-013:
identity, partner display fields, authoritative WhatsApp, domain/display phone,
and present analytics/theme keys. Print the SHA-256 of the future exact canonical
snapshot bytes alongside it. Do not emit token, email, payment, notes, timestamps
or unrelated onboarding data.

### Gate C — real entitlement

Use the real protected internal endpoint. Direct localhost access is not a safe
bypass because the route requires the Cloudflare-injected Access assertion.
The supported operator flow calls `[ADMIN_ORIGIN]` through Cloudflare Access
using a valid `CF_Authorization` session value read with hidden terminal input.
The cookie value is passed only to the child process environment, never printed,
written, placed in command arguments or committed.

Validate current entitlement identity, `commercialState=KNOWN`, included
`BUSINESS`, and the canonical Business target. Print the exact canonical
entitlement and its SHA-256. Manually reconstructing entitlement from activation,
grants, ledger or targets is prohibited because it may diverge from the service.

If hidden input is unavailable or the Access session is missing/expired, stop
and request an authorized Cloudflare Access operator. Do not echo the value or
fall back to a secret-bearing command line.

### Gate D — approved Business profile

Build the exact CEO-approved pilot profile from restricted values:
`[APPROVED_ROLE]`, `[APPROVED_DEFAULT_MESSAGE]`, and approved canonical
site/SEO, Hero and CTA copy.

It must contain no direct registration URL, VSL, thumbnail, Hero media URL,
purchase/store URL, materialized CTA URL or phone identifier. Print its exact
canonical SHA-256 and a separate contractual preview proving both CTA destinations
resolve to the same dynamically constructed WhatsApp URL with encoded message.
The preview is not part of `business-profile.json`.

## Sequence and stop conditions

1. Gate A must pass before reading partner data.
2. Gate B must prove the post-CDX-017 coherent identity.
3. Gate C requires the authorized hidden `CF_Authorization` intervention.
4. Gate D prints the reviewed profile and conversion preview.
5. Return all stdout/hashes to the restricted orchestrator.
6. Only a later, explicit instruction may persist the three inputs, create a
   manifest or run CDX-013 DRY_RUN.

## Risks and authorization

- Entitlement and activation evidence are point-in-time snapshots.
- Authentication material is sensitive and short-lived.
- Partner output belongs only in the restricted orchestrator audit channel.
- No EasyPanel command, snapshot/input/manifest write or production DRY_RUN was
  executed by Codex.

## Repository verification

Documentation only. `git diff --check` is clean. Tests, ESLint and build are not
applicable because executable code did not change.
