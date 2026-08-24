# CDX-20260824-002 — Jairo Business stdout gates

Owner: Codex Backend.

## Objective

Resume CDX-013/014/015 after the successful CDX-017 correction and approved
6/6 WhatsApp inventory. Provide read-only, stdout-only gates for the runtime
Business artifact, a privacy-minimized real Jairo activation snapshot, the
current entitlement contract and the exact approved pilot Business profile.

## Boundaries

- Allowed files: this request and its matching report only.
- Excluded: input persistence, manifests, production DRY_RUN, APPLY, Business
  source creation, UI, DNS, Hostinger, publishing and all data mutation.
- Dependencies: CDX-013/014/015, CDX-017 and approved inventory
  CDX-20260824-001 (`6 COHERENT / 0 CONFLICT / 0 MISSING`).
- Parallel-safe with tickets that do not modify Jairo activation/commercial
  state or the Business runtime artifact while stdout is captured.
- Any persistence is a later gate after the stdout and hashes are reviewed.

## Auth boundary

The internal entitlement route always verifies the Cloudflare-injected Access
assertion. Calling it through localhost does not bypass that check. The approved
operator path uses a `CF_Authorization` session through the protected public
origin, supplied by hidden input and never stored or printed. No supported
service CLI is packaged in the runner; reconstructing entitlement from files is
forbidden because it could diverge from grants, ledger and target readers.

Repository documentation must remain parameterized: no real phone identifier,
authentication material, partner-specific commercial copy or sensitive operator
value may be committed. Exact commands live only in the restricted orchestrator
response.
