# CDX-20260824-005 — Guarded ecosystem publication contract

## Status

FOLLOW-UP REQUIRED; not implemented by CDX-004.

## Objective

Close the generic backend gaps that prevent an authorized Business publication
from being safely executed through the current endpoints:

- require a READY PublishingTarget and reject legacy remote-root fallback;
- never read or use `HOSTINGER_SFTP_REMOTE_ROOT` as a publication destination;
  consume only the immutable READY PublishingTarget v2 `remoteRoot` returned by
  provisioning;
- keep provisioning readiness distinct from publication readiness;
- stage and commit a complete remote package with deterministic rollback/retry;
- add claim/planHash/journal/idempotency around one allowlisted publication;
- verify Business VSL, poster, both dynamic WhatsApp CTAs, required assets,
  HTTPS/SSL and ecosystem isolation;
- update PublishingTarget publication state only after public verification.

## Boundaries

Generic backend publication/verification only. No UI, Landing Builder, Product
or Brand source changes, apex redirects, payments, DNS/provider execution or
production operations in the ticket implementation.

## Dependency

Starts only after CDX-004 audit confirms the production PREVIEW contract.
