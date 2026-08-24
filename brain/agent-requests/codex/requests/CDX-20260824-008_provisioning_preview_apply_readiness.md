# CDX-20260824-008 — Provisioning PREVIEW / APPLY readiness separation

## Status

IMPLEMENTED FOR AUDIT. No production execution authorized.

## Owner and scope

- Owner: Codex Backend.
- Dependency: CDX-007.
- Allowed: guarded provisioning command/tests and request/report docs.
- Excluded: provider clients/services, UI, production data, EasyPanel, DNS,
  provisioning, publication and CDX-006 execution.

## Objective

Keep Jairo Business PREVIEW read-only and computable when provider/APPLY
configuration is absent. Missing or invalid APPLY configuration is returned only
under `applyReadiness`; it does not set `blocked` on an otherwise valid plan.

APPLY remains fail-closed and, before claim acquisition or provider invocation,
requires:

- `PARTNERHUB_PROVISIONING_IPV4` present and valid IPv4;
- Hostinger API token and API/SFTP username;
- hidden `CF_Authorization` value;
- HTTPS `PARTNERHUB_INTERNAL_BASE_URL`.

Neither missing values nor their contents enter `planMaterial`/`planHash`.
PREVIEW never constructs a request or calls the provider.

## Runbook constraint

The corrected runbook uses short, separately pasted gates. Entitlement download
is the only authenticated PREVIEW preparation and asks for the cookie with
hidden input. Provider configuration is not requested before PREVIEW. Each gate
stops independently; operators must never paste commands left after a failed
`set -e` shell into a new prompt.

## Authorization

Implementation/tests/push only. PR is not authorized. No EasyPanel, PREVIEW,
APPLY or provider call is authorized by this ticket.
