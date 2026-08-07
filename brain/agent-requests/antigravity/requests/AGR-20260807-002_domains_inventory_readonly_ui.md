# AGR-20260807-002 - Domains inventory read-only UI

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- PH-038A completed.
- Consume the stable `GET /api/internal/domains` contract.
- Cloudflare Access protects the production request; do not add or forward authentication secrets.

## Single outcome

Connect the existing `/domains` menu to a truthful, read-only domain inventory view.

## Scope

- Render the three `kind: MASTER` entries in a compact master-domain section.
- Render `PARTNER_LEGACY` and `PARTNER_TARGET` entries in a searchable/filterable partner inventory.
- Present these fields independently; never collapse them into one status:
  - `assignmentState`
  - `provisioningState`
  - `hostingState`
  - `dnsState`
  - `sslState`
  - `publicationState`
  - `verificationState`
- Clearly distinguish legacy root domains from explicit provisioned targets.
- Handle loading, empty, Access 401, and safe generic failure states.
- Responsive desktop, tablet, and mobile behavior.

## API response

`GET /api/internal/domains` returns `{ domains: DomainInventoryItem[] }`.

Each item contains:

- `id`, `kind`, `hostname`, `siteId`, `ecosystemType`
- `partner: { id, fullName, brandName } | null`
- the seven state fields listed above
- optional `verifiedAt`, `lastErrorCode`, and `updatedAt`

The API intentionally does not return email, phone, owner key, remote root, DNS record ID, tokens, or raw provider responses.

## Allowed files/modules

- New frontend-only component(s) under `app/web/components/` dedicated to Domains.
- `app/web/app/(app)/[module]/page.tsx` only to connect the existing `domains` slug.
- Frontend-local type definitions if required; mirror the API contract without changing it.

## Excluded files/modules

- `app/web/app/api/**`
- `app/web/server/**`
- Prisma, auth, proxy, Docker, DNS, Hostinger, Cloudflare, SFTP, environment files, and dependencies.
- Existing backend contracts and PH-036/PH-038 documentation.

## Explicitly out of scope

- No live DNS diagnostic button.
- No provisioning, publication, retry, delete, or mutation action.
- No registrar instruction modal.
- No invented `producto.*`, `negocio.*`, or marca-personal entries when absent from the API.
- No glassmorphism mandate; follow the existing PartnerHub design system.

## Parallel-safe with

- PH-038B, because Codex will work only on backend diagnostic modules and API routes.

## Integration notes

- The browser calls the same-origin API normally; Cloudflare Access adds its assertion at the origin.
- A 401 must be shown as an expired/unauthorized admin session, not as a DNS failure.
- `UNKNOWN`, `NOT_TRACKED`, `LEGACY_NOT_TRACKED`, and `MANAGED_EXTERNALLY` are truthful states, not errors.

## Verification and report

- Targeted frontend lint.
- `npm run build` (the two existing build warnings are known and not introduced by this request).
- Manual responsive check for loading, empty, populated, 401, and failure states.
- Required report: `brain/agent-requests/antigravity/reports/AGR-20260807-002_domains_inventory_readonly_ui_DONE.md`.
- Do not broaden this request; create a new ID for follow-up work.
