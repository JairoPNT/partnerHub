# CDX-20260824-010 — EasyPanel operational chain diagnosis — DONE

## Executive result

The failed attempts do not demonstrate a PartnerHub, Hostinger, DNS or
provisioning-provider failure. They stopped in local shell/authentication
preconditions before the supported provisioning service was invoked. The safe
response is to keep operations paused, retire terminal improvisation and resume
only through one service-to-service Access architecture with authoritative
infrastructure configuration.

## Classification: our runbook/tooling failures

### Shell/runtime assumptions

- Instructions assumed Bash behavior while the EasyPanel runtime shell can be
  BusyBox `sh`; shell-specific input flags and syntax were not portable.
- A gate assumed `curl` was installed without first making that capability part
  of the deployed/runtime contract.
- A residue check used GNU `find -printf`, which is not portable to BusyBox
  `find`.
- Long pasted blocks combined `set -e` with commands following a possible
  failure. When the shell exited, remaining pasted text was interpreted in a
  new/out-of-context prompt. This is a runbook design defect.

### Contract/gate ordering

- CDX-007 PREVIEW originally required provider credentials and
  `PARTNERHUB_PROVISIONING_IPV4`, mixing APPLY readiness into a read-only plan.
  CDX-008 corrected the code contract, but the earlier runbook had already
  exposed the sequencing defect.
- The IPv4 value seen in tests or historical DNS was never authoritative and
  must not have been presented as an operational candidate.

### Authentication/transfer

- Reusing a human browser `CF_Authorization` cookie from EasyPanel was
  incompatible with enabled Cloudflare Binding Cookie. Without the browser's
  associated `CF_Binding`, the observed HTTP 302 is expected Access behavior,
  not an origin failure.
- Copying `CF_Binding` would defeat the protection boundary and is prohibited.
- The attempted Base64 transfer was an improvised terminal transport with weak
  framing/portability and failed before producing an approved canonical
  snapshot. It is retired.

## Classification: actual server/provider evidence

### Confirmed

- The deployed Business source existed and had the previously approved
  identity/hash before this chain.
- The PublishingTarget v2 file for `jairo-pinto-business` was absent when Gate A
  tested it; that absence is the reason provisioning is required.
- `PARTNERHUB_PROVISIONING_IPV4` was absent in the service environment at the
  failed CDX-007 gate.
- The entitlement endpoint returned correct JSON in an authenticated browser.
- Requests from EasyPanel using only the copied human authorization cookie
  returned HTTP 302 at Cloudflare Access.
- No target was created and no supported provider call was initiated by the
  failed PREVIEW attempts.

### Not demonstrated

- No evidence shows Hostinger API failure, DNS failure, SSL failure, document
  root conflict or provisioning-service failure.
- No provider-derived `remoteRoot` exists yet for this Business target.
- No authoritative hosting IPv4 has been supplied or configured.
- No Service Token or Service Auth policy is confirmed configured.
- No production CDX-007 PREVIEW result or `planHash` has been accepted.

## Safely known current state

The following is the last evidence-backed state; it is deliberately not upgraded
from “known/reported” to “verified now” because this documentation ticket runs no
commands:

- Jairo Business source: materialized and previously hash-approved.
- Business PublishingTarget v2: last confirmed absent.
- Provisioning journal/claim: none created by the stopped gates.
- Provider/DNS/SSL mutations: none initiated by CDX-007/008/009 attempts.
- Input parent directory: reported created.
- CDX-007 staging directory: reported/expected empty after failed transfer; not
  reverified in this ticket.
- Entitlement snapshot/manifest: no accepted canonical artifact from the failed
  attempts.
- CDX-006 capability probe: not executed because no READY target/remoteRoot.
- Apex, Product and Brand: no mutation reported.

Any unexpected file in the staging/input/audit/target locations must be treated
as residue requiring inventory and human disposition, never automatic cleanup.

## Single durable architecture

### Authentication

Use a dedicated Cloudflare Access Service Token with minimum application/path
scope and a `Service Auth` policy. Store its Client ID and Secret only in
EasyPanel secret environment variables. Requests use the official service-token
headers and reject redirects. Human browser cookies and browser binding material
never enter the container.

The operator-export fallback implemented by CDX-009 is not selected for this
production continuation. It remains code that can be reviewed separately, but
must not appear in the resumed operational path. There will be no terminal
Base64 or pasted JSON fallback.

### Infrastructure address

Obtain the current assigned IPv4 for the `jairopinto.pro` hosting account from
the authoritative Hostinger control plane or an explicitly supported provider
response. Record source and timestamp, then configure it server-side as
`PARTNERHUB_PROVISIONING_IPV4`. Tests, old A records and other partners may only
corroborate; they cannot select the value.

### Execution surface

Future operational work must be expressed as versioned application maintenance
commands with structured JSON output and portable runtime dependencies. Shell is
limited to launching one command per gate. No heredocs, hidden interactive
prompts, long `set -e` pastes, GNU-only flags or unverified binaries.

## Minimal future gates (definitions only; no commands)

1. **Infrastructure authorization:** create scoped Service Token and Service
   Auth policy; configure secrets; obtain/configure authoritative IPv4. Record
   ownership, scope, expiry and rotation.
2. **Runtime capability gate:** one application command verifies required script
   versions, filesystem locations and dependencies without writes or secrets.
3. **Residue inventory gate:** one read-only application command classifies
   input/staging/claim/journal/target state. Any residue pauses the chain.
4. **Entitlement snapshot gate:** the CDX-009 Service Token mode obtains HTTP 200
   JSON, validates identity, canonicalizes and atomically stages the snapshot.
5. **Manifest gate:** one application command binds source/entitlement hashes and
   exact allowlist; no hand-built shell JSON.
6. **Provisioning PREVIEW gate:** CDX-008 emits `blocked:false`, disposition,
   `initialTargetHash`, `applyReadiness` and reviewed `planHash`; no provider.
7. **Separate APPLY authorization:** only after evidence audit; guarded CDX-007
   invokes the supported provisioning service and must end READY/PENDING or
   retain partial state fail-closed.
8. **Post-provision verification:** independently verify exact target identity,
   provider-derived `remoteRoot`, DNS/SSL readiness, publication still PENDING,
   and apex/Product/Brand unchanged.
9. **CDX-006 continuation:** only after target verification, begin its separate
   capability PREVIEW/probe authorization chain.

Each gate produces a small structured result, is pasted/executed alone and never
implies authorization for the next gate.

## Risks and dependencies

- Cloudflare configuration is an infrastructure write requiring separate CEO /
  administrator authorization.
- Service Tokens require least privilege, expiration, rotation/revocation and
  Access-log review.
- Provider provisioning remains resumable rather than transactionally atomic;
  post-provider partial state must remain visible for audited recovery.
- A small follow-up may be required to add application-owned runtime/residue and
  manifest commands before any further EasyPanel attempt.

## Verification and repository state

Documentation review and `git diff --check` only. No code, PR or external
operation was performed by this ticket.
