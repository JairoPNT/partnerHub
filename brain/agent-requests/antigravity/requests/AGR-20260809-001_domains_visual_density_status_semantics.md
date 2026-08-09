# AGR-20260809-001 - Domains visual density and status semantics

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- Follow-up to completed `AGR-20260807-002`.
- PH-038A and PH-039 are completed and deployed.
- The `GET /api/internal/domains` contract is stable and must not change.

## Single outcome

Correct the visual density, width usage, status semantics, and responsive behavior of the existing read-only Domains inventory without adding features or mutations.

## User acceptance problems

1. Desktop content is constrained by `max-w-7xl mx-auto` and duplicates large lateral padding instead of using the dashboard content width.
2. Master cards use unexplained abbreviations (`PROV`, `HOST`, `VERIF`) and render long raw backend values outside their cells.
3. Partner rows expose implementation vocabulary (`Legacy`, `LEGACY_NOT_TRACKED`, `NOT_TRACKED`, `UNKNOWN`) as long pills that overflow the table.
4. Mobile cards still place long state strings side by side, causing overlap and truncated `siteId`/verification content.

## Required changes

### 1. Width and layout

- Remove the component-level fixed maximum width and centering that narrows the page (`max-w-7xl mx-auto`).
- Use the full width supplied by the dashboard shell.
- Preserve only the dashboard gutter already established by the surrounding layout; do not add a second large desktop gutter.
- Desktop master cards must use the available row width evenly.
- The partner inventory must avoid a permanent horizontal scrollbar at normal desktop widths (1366px and above).

### 2. Human-readable terminology

- Replace unexplained abbreviations with accessible labels or tooltips:
  - `PROV` → `Aprovisionamiento`
  - `HOST` → `Hosting`
  - `DNS` → `DNS`
  - `SSL` → `SSL`
  - `VERIF` → `Verificación`
- Replace `Partner Raíz (Legacy)` with `Dominio raíz existente`.
- Replace `Target Subdominio` with `Subdominio administrado`.
- Do not show the word `Legacy` to the operator.
- Raw enum values remain internal and may appear only in an accessible tooltip/detail, not as the primary visible label.

### 3. Shared compact status indicator

Create one reusable frontend-only status indicator inside the Domains component/module. It must use icon + color + accessible label/tooltip; color alone is insufficient.

Required semantic mapping:

| Backend states | Visible meaning | Icon/color intent |
| --- | --- | --- |
| `READY`, `RESOLVED`, `VERIFIED`, `PUBLISHED`, `CREATED`, `SUCCESS` | Correcto / Verificado | green check |
| `ASSIGNED`, `MANAGED_EXTERNALLY` | Asignado / Gestión externa | blue check, link, or shield |
| `PENDING`, `DNS_PENDING`, `SSL_PENDING`, `HOSTING_CREATED` | En proceso | amber clock/spinner |
| `UNKNOWN` | Sin información | amber question mark |
| `NOT_CHECKED`, `NOT_STARTED` | Aún no comprobado | neutral/amber minus, clock, or question; never red X |
| `LEGACY_NOT_TRACKED`, `NOT_TRACKED` | No monitoreado | neutral gray minus/eye-off |
| `FAILED`, `VERIFY_FAILED`, `ERROR` | Fallo real | red X/alert |

- `NOT_CHECKED` is not a failure and must not be represented as a red X.
- Use compact icon-first indicators in master cards and technical table columns.
- Provide `title`, tooltip, `aria-label`, or equivalent accessible text explaining the state.

### 4. Master domain cards

- Keep hostname, ecosystem, master identity, external link, and `siteId` readable.
- Replace the five long status pills with compact aligned indicators.
- Prevent any status from crossing into its neighbor at desktop, tablet, or mobile widths.
- On mobile, use a small grid or stacked definition layout instead of forcing all states into one line.

### 5. Partner inventory

- Keep domain, partner, ecosystem/type, and technical states discoverable.
- Use compact icon status cells for assignment, provisioning, hosting, DNS, SSL, publication, and verification.
- Headers may use short visible labels only when a tooltip or accessible label supplies the full name.
- Desktop must fit within the dashboard content area without text overlap.
- On narrow screens, replace the wide table presentation with readable stacked partner cards or an equivalent responsive pattern; do not rely solely on horizontal scrolling.
- Search and filters must continue working unchanged.

## Allowed files/modules

- `app/web/components/domains-inventory-view.tsx`
- Optional new frontend-only helper colocated under `app/web/components/` and used only by Domains, if genuinely necessary.
- Matching completion report.

## Excluded files/modules

- `app/web/app/api/**`
- `app/web/server/**`
- `app/web/app/(app)/[module]/page.tsx` unless a documented blocker proves the existing route wrapper itself imposes the width constraint.
- Shared dashboard shell, sidebar, global design system, dependencies, auth, Prisma, Docker, Easypanel, Cloudflare, DNS, Hostinger, SFTP, and environment files.
- No backend enum or API contract changes.

## Explicitly out of scope

- No live DNS diagnostic.
- No provisioning, publication, retry, edit, delete, or mutation action.
- No registrar assistant/modal.
- No unrelated dashboard redesign.

## Parallel-safe with

- PH-038B backend diagnostic work, because this request cannot touch API/server files.

## Verification

- Targeted ESLint for changed frontend files.
- `npm run build`.
- Manual visual verification at minimum:
  - desktop 1440px and 1366px;
  - tablet 768px;
  - mobile 390px or narrower.
- Confirm no text/status overlap, no clipped master state, and no mandatory horizontal table scroll at normal desktop widths.
- Confirm every icon-only state has an accessible label/tooltip.
- Confirm `NOT_CHECKED` is non-error and real failures remain red.

## Report and branch

- Required report: `brain/agent-requests/antigravity/reports/AGR-20260809-001_domains_visual_density_status_semantics_DONE.md`.
- Suggested branch: `antigravity/AGR-20260809-001-domains-visual-density-status-semantics`.
- If another frontend task is editing `domains-inventory-view.tsx`, stop and report the overlap instead of merging changes silently.
