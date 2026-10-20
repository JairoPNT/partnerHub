# CDX-20261020-002 — Claudia Business publication

- Owner: Codex (operations), Jairo as account owner and deployment operator.
- Authorization: Jairo requested publication of `negocio.claudiacalero.pro` and necessary restoration of PartnerHub's automatic publication after the hosting migration.
- Scope: Verify Claudia's current entitlement/onboarding, adopt the existing Business subdomain through the supported provisioning service, generate her Business source from the updated master, publish through the existing guarded worker and verify public content, video, poster and partner WhatsApp links.
- Allowed: Claudia's Business source/target/package/job; read-only legacy Product source, lead and entitlement; current account `u708491435`; corrected provisioning IPv4 configuration for the new hosting.
- Excluded: Root/Product publication or source changes, other clients, new purchases, auth/policy expansion, credential changes, advertising spend and Personal Brand publication.
- Dependencies: Master refresh CDX-20261019-003 applied; integrated generation corrections CDX-20261020-003/004 must be deployed before generating Claudia's source.
- Parallel-safe with: CDX-20261020-003/004/005 code work in separate Git branches; this operation does not edit application source.

## Verified evidence as of 2026-10-20 (America/Bogota)

- User-provided terminal output confirms master refresh `APPLIED`, new package hash `9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046` and archived legacy package.
- Missing Business source and target confirmed by production read-only inspection.
- PartnerHub shows Claudia PAID, active BUSINESS courtesy and 100% onboarding; fresh authenticated entitlement GET returned HTTP 200 and BUSINESS included.
- Hostinger MCP lists enabled `negocio.claudiacalero.pro` on order `1010151457`, account `u708491435`, document root `/home/u708491435/domains/claudiacalero.pro/public_html/negocio`.
- DNS MCP confirms one enabled ALIAS for `negocio`; public page currently remains Hostinger's default page.
- SFTP is configured for `109.106.251.170` / `u708491435`; provisioning IPv4 still refers to prior hosting `82.29.157.103` and needs correction.
- Service token can read entitlement; provisioning HTTP route returns a Cloudflare login redirect (302). No Access policy or credential changes were made. The already packaged in-process supported provisioning service is available to the authorized container operator.

## Target registration completed

The authorized container operator invoked the packaged supported provisioning service after a fresh authenticated entitlement read and exact lead/site/domain/account checks. It adopted the existing Hostinger subdomain using the new IP as its explicit environment parameter and persisted Claudia's target with `provisioningState=READY`, `publicationState=PENDING`, `hostingerState=READY`, `dnsState=RESOLVED`, `sslState=READY` and the MCP-verified document root. No source was generated and no publication job was created by this operation.

EasyPanel's environment editor was updated through an exact named-line replacement of `PARTNERHUB_PROVISIONING_IPV4=82.29.157.103` with `PARTNERHUB_PROVISIONING_IPV4=109.106.251.170`; other environment values were not edited or recorded. The new setting requires deployment to become the running container's environment.

Status: In progress. Target registration is complete; source generation, publication, and public verification remain pending deployment of the reviewed generation corrections.
