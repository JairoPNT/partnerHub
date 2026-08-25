# CDX-20260824-013 — DONE

## Result

The guarded Jairo Business provisioning command no longer calls a Cloudflare-protected HTTP endpoint. APPLY loads a Docker-bundled adapter that invokes the existing supported Hostinger/DNS provisioning service in process. PREVIEW remains read-only and does not load the adapter or call providers.

## Contract

- Provider contract: `IN_PROCESS_SUPPORTED_PROVISIONING_SERVICE`.
- APPLY readiness requires Hostinger credentials, authoritative `PARTNERHUB_PROVISIONING_IPV4`, and Cloudflare DNS credentials.
- Missing or invalid APPLY configuration blocks before claim/provider.
- The bundled runtime derives IPv4 only from server environment and reuses the existing provider configuration helpers.
- No entitlement/auth contract was changed.
- CDX-012 was preserved untouched and is not part of this delivery.

## Files

- `Dockerfile`
- `app/web/package.json`
- `app/web/package-lock.json`
- `app/web/scripts/jairo-business-guarded-provisioning.mjs`
- `app/web/scripts/jairo-business-guarded-provisioning.test.mjs`
- `app/web/server/runtime/jairoBusinessInProcessProvisioner.ts`
- request/report CDX-013

## Verification

- Guarded provisioning tests: PASS 12/12.
- Provisioning service regressions: PASS 11/11.
- Provisioning API contract: PASS 3/3.
- Focused ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- esbuild runtime bundle: PASS; bundled export executes and fails closed when IPv4 is absent.
- `git diff --check`: PASS.
- `origin/main` equals the ticket base at final verification.

## Operational status

No EasyPanel command, entitlement snapshot, PREVIEW, APPLY, Hostinger, DNS, SFTP, publication, or production write was executed.

## Remaining dependencies

1. Obtain the current authoritative IPv4 for the `jairopinto.pro` hosting from Hostinger control plane and configure it server-side.
2. Merge/deploy this ticket.
3. Run an app-owned residue/manifest gate and provisioning PREVIEW.
4. Review exact planHash before separately authorizing APPLY.

## Risks

- Provisioning remains resumable rather than transactionally atomic across Hostinger and DNS.
- The in-process adapter is Jairo-specific; generic Partner/Payments/Landing Builder automation remains a later integration ticket.
- Existing npm audit baseline reports 12 findings; dependencies other than the explicit build-time `esbuild` addition were not intentionally upgraded.
