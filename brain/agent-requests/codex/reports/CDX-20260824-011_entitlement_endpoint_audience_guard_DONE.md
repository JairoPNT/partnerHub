# CDX-20260824-011 — Entitlement endpoint and audience guard — DONE

## Result

- Compiled the exact Jairo entitlement endpoint into the helper.
- Removed the CLI endpoint parameter and reject any attempt to supply it.
- Reject Markdown-rendered/lookalike endpoint strings before network activity.
- Added route-specific Access audience configuration for the entitlement route.
- Chose strict route audience over accepting multiple audiences.

## Audience diagnosis

Before this change the backend accepted only `CLOUDFLARE_ACCESS_AUD`. A JWT
issued by the new path-specific application with a different `aud` would pass
Cloudflare Service Auth but fail origin JWT verification as
`ACCESS_TOKEN_INVALID`. The route now explicitly reads
`CLOUDFLARE_ACCESS_ENTITLEMENT_AUD`; that value must equal the AUD shown by the
path-specific Access application. The default audience remains unchanged for
all other internal routes.

## Files

- `app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs`
- its focused test;
- `app/web/server/auth/cloudflareAccessAuth.ts` and test;
- entitlement API route;
- matching request/report docs.

## Verification

- snapshot helper: 7/7 PASS;
- Cloudflare Access auth: 5/5 PASS;
- ESLint `--no-ignore` on all changed source/test/route files: PASS;
- production build: PASS (existing Turbopack trace warning only);
- `git diff --check`: PASS.

## Operations

No EasyPanel, Cloudflare write, provider/DNS, production snapshot, PREVIEW or
APPLY. PR not opened.
