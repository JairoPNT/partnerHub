# AGR-20260809-003 - Meta Pixel assignment UI

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- PH-040A is merged through PR #92 and deployed.
- The generated-page contract already accepts `integrations.meta.pixelId` and injects the managed Meta Pixel base code.
- The activation-lead contract already exposes `onboardingData.metaPixelId`.
- This request may be implemented in parallel with `AGR-20260809-002`; their allowed source files do not overlap.

## Single outcome

Allow an operator to view, assign, and update the Meta Pixel ID of the selected partner from the existing Analytics and Metrics module.

## Product placement

- Do not create a new primary-menu module.
- Meta Pixel belongs inside the existing `Analítica y Métricas` module beside the current Google Analytics 4 configuration.
- Keep GA4 behavior operational and visually distinguish the two providers.

## Existing contracts

- Read: `selectedLead.onboardingData?.metaPixelId`.
- Save: `PATCH /api/internal/activation-leads/{id}` with:

```json
{
  "onboardingData": {
    "metaPixelId": "123456789012345"
  }
}
```

- Never send script text, access tokens, Meta credentials, dataset credentials, or secrets.

## Required behavior

### 1. Meta Pixel section

- Add a clearly titled `Meta Pixel` configuration section for the selected partner.
- Include a short explanation that the operator must paste only the numeric Pixel ID / Dataset ID, never the complete JavaScript snippet.
- Provide one text input with an explicit label such as `Pixel ID de Meta`.
- Load the saved `metaPixelId` whenever the operator selects or refreshes a partner.
- Saving GA4 must not erase Meta Pixel, and saving Meta Pixel must not erase GA4 or operator notes.

### 2. Validation

- Trim the input.
- Accept digits only, with a length between 5 and 32 characters, matching PH-040A.
- Reject spaces inside the ID, letters, punctuation, pasted `<script>` content, and arbitrary JavaScript.
- Show an inline, provider-specific validation message.
- An empty value is valid only while the selected partner has no Pixel configured; do not present it as a removal operation.
- Do not add a remove/clear action in this ticket. Removing a Pixel already propagated to a generated source requires the separate backend follow-up `PH-040A1`.

### 3. Truthful lifecycle display

- When no ID is saved, show `Pendiente`.
- When an ID is saved, show `Configurado`.
- Do not label the Pixel `Publicado` or `Verificado` in this ticket because PH-040B public verification does not exist yet.
- After a successful save, explain that the page must be regenerated and published for the change to reach the public domain.
- Do not automatically generate or publish from this screen.

### 4. Operator guidance

- Provide a concise external link to Meta Events Manager for locating the Pixel/Dataset ID.
- Make clear that the Pixel ID is not an API token.
- Preserve the existing GA4 checklist and manual GA4 verification behavior unchanged.

### 5. Responsive and accessible UI

- The GA4 and Meta sections must remain readable at 390px and normal desktop widths.
- Input, status, save action, help link, success message, and validation error must have accessible labels and keyboard behavior.
- Do not rely on color alone for status.
- Avoid exposing the full saved identifier in partner-list summary views unless it is necessary for editing the selected partner.

## Allowed files/modules

- `app/web/components/analytics-and-metrics-view.tsx`
- One optional frontend-only helper colocated under `app/web/components/` and used only by Analytics and Metrics, if genuinely necessary.
- Matching completion report.

## Excluded files/modules

- `app/web/components/app-shell.tsx`
- `app/web/components/sidebar.tsx`
- `app/web/components/topbar.tsx`
- `app/web/components/domains-inventory-view.tsx`
- `app/web/app/api/**`
- `app/web/server/**`
- Generated-page templates and generator services.
- Backend, Prisma, auth, Docker, Easypanel, Meta API automation, environment variables, and dependencies.

## Explicitly out of scope

- No Meta login or OAuth.
- No Conversions API.
- No custom events such as Lead, Contact, Purchase, or WhatsApp click.
- No Google Ads changes.
- No automatic publication or public-domain verification.
- No removal of an already configured Pixel.
- No consent-management implementation.
- No redesign of the entire Analytics and Metrics module.

## Parallel-safe with

- `AGR-20260809-002`, because that request is restricted to dashboard-shell navigation files.
- `PH-040B`, provided its API/read contract does not change during this UI implementation.

## Verification

- Targeted ESLint for every changed frontend file.
- `npm run build`.
- Manual verification at 390px and desktop width.
- Verify selecting partners with and without an existing `metaPixelId`.
- Verify valid numeric save and invalid input rejection.
- Verify GA4 data and operator notes survive Meta updates.
- Verify Meta data survives GA4 updates.
- Verify no request contains script code or credentials.

## Report and branch

- Required report: `brain/agent-requests/antigravity/reports/AGR-20260809-003_meta_pixel_assignment_ui_DONE.md`.
- Suggested branch: `antigravity/AGR-20260809-003-meta-pixel-assignment-ui`.
- If another frontend task is editing `analytics-and-metrics-view.tsx`, stop and report the overlap instead of merging changes silently.
