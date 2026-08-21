# CDX-20260821-015 — Business WhatsApp conversion contract — DONE

## Result

The Jairo Business preview no longer requires or accepts
`cta.directRegisterUrl`. Both current Business conversion URLs are explicitly
materialized as the same
`https://wa.me/<validated activation-lead WhatsApp>?text=<encoded defaultMessage>`
URL and the direct registration URL remains empty. Product `purchaseUrl` is
ignored. A contractual test reproduces the deployed `app.js` precedence and
proves primary and secondary resolve identically.

## Safety and scope

Backend script/tests/docs only. No frontend gap: the deployed Business runtime
already supports the safe WhatsApp fallback. No EasyPanel, snapshots, manifest,
production DRY_RUN, APPLY, DNS, publishing or real data.

## Verification

- Focused Jairo Business tests: PASS 12/12.
- Business correlation: PASS 9/9.
- Business poster: PASS 5/5.
- Ecosystem generation contract: PASS 14/14.
- ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js build: PASS, 36 routes (pre-existing workspace/NFT warnings).
- `npm ci`: 12 pre-existing audit findings; dependencies unchanged.
