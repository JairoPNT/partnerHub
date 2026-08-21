# CDX-20260821-014 — Jairo Business clean master alignment — DONE

## Result

The CDX-013 preview now consumes the approved Hero and pilot VSL directly from
the SHA-256-pinned runtime Business artifact. `business-profile.json` can no
longer override VSL or Hero media. The VSL poster remains derived from Product.

## Pinned dependency

- PR #152 merge: `407de1dca61817652d181bbe6836197e20a0cb11`.
- AGR implementation: `79e3afa462e5c26481dd47db0dddc1268e43363d`.
- Canonical/runtime asset SHA-256:
  `7aa79accd64b349817fccc59007edc743e7ed15416db94dd3d9fdac4a900a01e`.
- Hero: `hero-desktop.webp` / `hero-mobile.webp` under the approved Business CDN.
- VSL: `business-vsl-pilot-v1.mp4`.

## CEO input only

The pilot profile now contains only commercial/partner decisions:

- role;
- siteTitle, ogTitle, ogDescription, metaDescription;
- defaultMessage;
- hero badge, headline and subheadline;
- CTA primaryText, directRegisterUrl, secondaryText and guaranteeText.

It must not contain Hero media fields, `vsl`, or `vsl.thumbnailUrl`.

## Safety

DRY_RUN only, `changed:false`; no EasyPanel, snapshots, production DRY_RUN,
APPLY, source write, target, DNS, Hostinger, publishing, regeneration or payment.

## Verification

- CDX-013/014 focused tests: PASS 11/11.
- Business correlation: PASS 9/9.
- Business poster: PASS 5/5.
- Ecosystem templates: PASS 8/8.
- Ecosystem generation contract: PASS 14/14.
- ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS (36 routes; pre-existing workspace/NFT warnings).
- `npm ci`: 12 pre-existing audit findings (2 moderate, 10 high); dependencies unchanged.
