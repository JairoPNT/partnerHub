# CDX-20261020-002 — Claudia Business published

Status: COMPLETE. Verified on 2026-10-20, America/Bogota.

## Result

- Public URL: https://negocio.claudiacalero.pro/
- Supported publication worker: `SUCCEEDED / COMPLETE`, attempt 1 for the final corrected source; completed `2026-10-20T16:55:11.384Z`.
- Current job: `870d38cc66433f69a5904fa09fa7c950b9dd06afc153c32a9d7103b76240cba7`.
- Target readback: provisioning READY, publication READY, DNS RESOLVED, SSL READY.
- Hostinger account/root were verified against its MCP inventory before target registration. Existing enabled Business subdomain and ALIAS were adopted, not recreated or redirected elsewhere.

## Implementation and deployment

PR #210 (https://github.com/JairoPNT/partnerHub/pull/210) merged at `f839327af7b00982f8a01d06f23d9d5d9f1d35a3`. Independent review approved the integrated generation corrections. Full Business tests 51/51, publication job/worker/event tests 33/33, lint, production build, TypeScript and diff checks passed. The new running container was verified to contain the Business master validator.

EasyPanel configuration was corrected only for the provisioning IPv4 of the migrated hosting and the existing SFTP pin's Base64 padding. The latter retained the same SHA-256 identity; host verification was not disabled or broadened. Both settings were verified after deployment. Commands used sh.

## Actual publication sequence

1. Fresh authenticated entitlement confirmed BUSINESS and matched Claudia's exact active approved lead, site and operator-assigned domain.
2. Packaged supported provisioner registered the already-existing Business target READY/PENDING in the migrated account.
3. Existing local application generation endpoint generated Business content and automatically enqueued the worker. The legacy Product source was checked byte-for-byte unchanged.
4. First job stopped safely before publication due to missing Base64 padding in the SFTP pin. After format correction, the same job passed the SFTP capability probe but the publication gate rejected a Product purchase URL inherited in the operator-prepared input (`BUSINESS_PURCHASE_URL_PRESENT`). No publication bypass was used.
5. The existing generator was called with that Product-only input field omitted. Fresh source event produced the final job, which completed publication and verification successfully.
6. The superseded failed job was cancelled through the authenticated supported API, preserving its evidence/history. No stale failed job was retried after the source changed.

## Public verification

- Chrome loaded actual Claudia-branded Business content, populated benefits/methodology/FAQ and the personalized Product hero as VSL poster (image loaded, width 1672).
- All five public CTA anchors resolve to Claudia's validated WhatsApp identity. No public external non-WhatsApp anchor was present. No message was sent.
- VSL v2 loaded and played: browser media readyState 4, currentTime advanced, duration 169.127292 seconds, no media error.
- ffprobe of the actual public MP4 confirmed H.264 video and AAC stereo audio at 48000 Hz. Audible browser playback was not claimed: browser media was observed muted during the check.
- Local evidence: `.local-secrets/project-status/evidence/CDX-20261020-002/claudia-business-publicada.png` (ignored, no credentials).
- PartnerHub's existing per-site verification control was run only for Claudia Business after publication; its Master Sites row now reads `Publicado y verificado` at `20/10/2026, 12:01:26 p. m.`. Other rows were not acted on.
- Project-local `.project-status/status.json` was reconciled with this outcome and validated against the shared project-status schema. Global progress and financial amounts remain null; the reporting change does not alter product code.

## Boundaries and follow-up

No Product/apex publication, other partner publication, new purchase, Access policy expansion, credential change, or advertising spend. Historical Jairo targets were not revalidated and must not be assumed migrated/current.

Minor existing frontend issue: the static caption below the player still says 10 minutes although the VSL is 2:49 and the play overlay says 3 minutes. Antigravity owns this follow-up. Before launching ads, separately validate campaign measurement and review landing/video claims; this operation does not assert advertising-policy or legal approval.

Financial/progress metrics remain unquantified. No new decision is required to finish this publication; campaign setup/spend remains a separate authorization.
