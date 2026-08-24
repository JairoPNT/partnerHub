# CDX-20260824-004 — Jairo Business publishing preflight — DONE

## Result

Implemented a runtime-packaged, read-only PREVIEW for exactly one Business
identity. It reads the source, entitlement snapshot, raw PublishingTargets v2
inventory, configuration presence and published Business master package. It
never calls Hostinger, Cloudflare, DNS, HTTPS or SFTP and contains no write path.

The preview detects siteId/publicHost/owner+ecosystem conflicts, rejects all
invalid or legacy target records, pins source and entitlement hashes, preserves
the apex, forbids legacy publication fallback, and reports either create,
resume, or reuse for the isolated Business target.

## Contract audit

- Saved-source generation does support `BUSINESS`, selects the Business master
  and applies the Product-correlated VSL poster contract.
- Partner regeneration defaults to the published master package
  `ganomaster-business`; the preview blocks if its required runtime files are
  absent.
- PublishingTargets v2 support the canonical Business subdomain. For plan 360,
  `rootEcosystemType=PERSONAL_BRAND` remains redirect metadata only; the target
  stays on the Business subdomain.
- PublishingTarget `ownerKey` is the activation-lead UUID. `ownerSiteId` is the
  partner slug; they must not be conflated.

## Blocking gaps for APPLY

The current generic publication path is not approved for this operation:

1. it accepts legacy remote-root fallback when no PublishingTarget exists;
2. SFTP replacement is atomic per file, not for the complete package, and does
   not provide transaction ownership/journal/idempotent package rollback;
3. provisioning sets `publicationState=READY` before content publication;
4. verification skips Product commerce correctly for Business, but does not
   validate the Business VSL, poster, both WhatsApp CTAs or full isolation.

Therefore no APPLY command is released. Follow-up CDX-20260824-005 documents
the smallest generic backend capability required before provisioning/publication.
Manual SFTP or direct API improvisation is explicitly rejected.

## Files

- `app/web/scripts/jairo-business-publishing-preflight.mjs`
- `app/web/scripts/jairo-business-publishing-preflight.test.mjs`
- `app/web/package.json`
- `Dockerfile` (packages only the PREVIEW command)
- request, report and follow-up request documents

## Verification and state

- Focused PREVIEW tests: PASS 6/6.
- Ecosystem generation regressions: PASS 14/14.
- Hostname, entitlement, provisioning and target regressions: PASS 33/33.
- Focused ESLint with `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS (one pre-existing NFT tracing warning).
- `git diff --check`: PASS.
- No EasyPanel, provider, DNS, SFTP, regeneration, publication or production
  write was executed. PR remains unopened.

## Public validation matrix after the follow-up

Validate HTTPS/SSL, expected hostname and config identity; canonical VSL MP4 and
Product-derived poster; identical encoded-message WhatsApp links on both CTAs;
all required local assets returning success; no Product purchase link; no Brand,
Product or apex mutation; and final PublishingTarget state tied to verification.
