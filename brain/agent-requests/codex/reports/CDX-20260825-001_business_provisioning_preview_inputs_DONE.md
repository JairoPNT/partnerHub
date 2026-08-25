# CDX-20260825-001 — DONE

## Result

Added one short app-owned maintenance command that prepares Jairo Business provisioning inputs from the exact previously audited entitlement snapshot and immediately executes guarded PREVIEW. It does not use Cloudflare Access, cookies, pasted JSON, URLs, heredocs or provider calls.

## Contract

- Source hash compiled: `795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725`.
- Approved entitlement hash compiled: `da41622c14c8f6377285b4625c498012532554bfb8b079dc6edf05ad58b20399`.
- Fixed input/staging/target/state paths; final input, target or state presence blocks.
- Existing staging is accepted only when completely empty.
- Writes only `entitlement.json` and `manifest.json`, then uses a local atomic directory rename.
- PREVIEW must return `changed:false` and `providerCallsMade:false`.
- No cleanup is automatic after failure.

## Files

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/prepare-jairo-business-provisioning-preview.mjs`
- focused test
- request/report CDX-20260825-001

## Verification

- Preview-input tests: PASS 3/3.
- Guarded provisioning regression: PASS 12/12.
- Focused ESLint: PASS.
- Next.js build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.

## Operational status

No EasyPanel command, PREVIEW productivo, APPLY, provider, DNS, SFTP or publication was executed.

## Post-deploy command

Run from `/app` in EasyPanel Sh:

```sh
npm run maintenance:jairo-business-provisioning-preview
```

Expected nested preview: `mode:"PREVIEW"`, `changed:false`, `blocked:false`, `providerCallsMade:false`, `initialTargetHash:"ABSENT"`, APPLY readiness true, and a 64-hex `planHash`.

## Next gate

Review the exact stdout and planHash. APPLY remains separate and unauthorized until that review.
