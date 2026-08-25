# CDX-20260824-010 — EasyPanel operational chain diagnosis

## Status

DOCUMENTATION-ONLY DIAGNOSIS. All operational work is paused.

## Owner and scope

- Owner: Codex Backend.
- Inputs: CDX-007/008/009, operator evidence and Cloudflare Access docs.
- Allowed: redacted request/report documents only.
- Excluded: source/runtime changes, PR, EasyPanel, Cloudflare, Hostinger, DNS,
  production data, snapshots, PREVIEW, APPLY and new runbooks.

## Objective

Separate failures caused by our operational instructions from evidence about the
deployed service or providers, record the last safely known state without asking
the operator for commands, and select one durable architecture for resumption.

## Required decision

The only recommended continuation architecture is:

1. Cloudflare Access Service Token scoped to the PartnerHub application/path;
2. explicit `Service Auth` policy;
3. Client ID/Secret stored only as EasyPanel secrets;
4. authoritative current hosting IPv4 recorded from the hosting control plane
   and configured server-side;
5. application-owned maintenance commands for inventory, snapshot, manifest,
   PREVIEW and guarded APPLY.

Human cookie copying, Binding Cookie transfer, Base64 terminal transfer and
multi-step ad hoc shell runbooks are excluded from the resumed path.

## Authorization

This ticket authorizes documentation only. Any infrastructure configuration,
code change or operational gate requires a new explicit ticket/authorization.
