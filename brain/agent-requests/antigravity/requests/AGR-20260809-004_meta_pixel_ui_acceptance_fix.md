# AGR-20260809-004 - Meta Pixel UI acceptance fix

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- Follow-up to `AGR-20260809-003` commit `b47d6f5`.
- Start from the completed AGR-20260809-003 implementation; do not reimplement the feature.

## Single outcome

Correct the save semantics and provider-specific feedback of the Meta Pixel assignment UI before it is merged.

## Blocking findings

### 1. False removal state

When a selected partner already has `onboardingData.metaPixelId`, clearing the local field and submitting produces `metaPixelId: undefined`. `JSON.stringify` omits that property, so the backend preserves the previous Pixel. The current local UI can nevertheless remain blank and display `Pendiente`, contradicting persisted state.

Required correction:

- If the selected partner already has a saved Pixel and the submitted Pixel field is empty, block submission with an inline Meta-specific message explaining that removal is not available yet.
- Do not present clearing the input as successful removal.
- After every successful response, reload the Meta input from the returned `updatedLead.onboardingData.metaPixelId` so draft and persisted state cannot diverge.
- Derive the `Pendiente` / `Configurado` persisted status from the selected lead returned by the server, not merely from the unsaved input draft.

### 2. Provider error leakage

The current shared `fieldError` makes a Meta validation error appear below and visually invalidate the GA4 input.

Required correction:

- Keep distinct GA4 and Meta validation errors, or an equivalent provider-addressable error structure.
- A Meta validation failure must be rendered directly beside the Meta field and must not mark GA4 invalid.
- A GA4 validation failure must remain beside GA4 and must not mark Meta invalid.
- Clear the relevant provider error when its input changes or another partner is selected.

### 3. Misleading success copy

The shared save action always reports `Configuración de Google Analytics 4 guardada correctamente`, even when Meta was assigned or updated.

Required correction:

- Use truthful integration-neutral success copy, for example `Configuración de analítica guardada correctamente`.
- The success feedback must remind the operator that regeneration and publication are required before Meta reaches the public page.
- Do not claim `Publicado` or `Verificado`.

### 4. Stale full-object resubmission

The implementation spreads `...selectedLead.onboardingData` into PATCH payloads. The backend already performs the merge. Resending a stale client snapshot can overwrite unrelated onboarding fields changed elsewhere.

Required correction:

- Remove `...selectedLead.onboardingData` from both the configuration-save payload and the GA4 verification payload.
- Send only fields intentionally edited by the current action:
  - configuration save: `analyticsMeasurementId`, valid `metaPixelId`, and `operatorNotes`;
  - GA4 verification: `analyticsVerified: true`.
- Rely on the existing backend merge contract to retain unrelated fields.

## Allowed files/modules

- `app/web/components/analytics-and-metrics-view.tsx`
- Matching completion report.

## Excluded files/modules

- Every other source file.
- Backend, APIs, generator, templates, auth, database, infrastructure, dependencies, and other dashboard modules.

## Explicitly out of scope

- No Pixel removal implementation.
- No generation, publication, or verification action.
- No redesign or additional integration.
- No changes to the AGR-20260809-003 feature beyond the four findings above.

## Acceptance criteria

- [ ] Clearing an existing Pixel cannot produce a false successful/Pending state.
- [ ] Successful saves rehydrate form state from the server response.
- [ ] GA4 and Meta validation errors render independently.
- [ ] Success copy is truthful and mentions regenerate/publish.
- [ ] PATCH payloads contain only intentionally edited fields.
- [ ] GA4 behavior and Meta numeric validation remain functional.
- [ ] Targeted ESLint passes.
- [ ] `npm run build` passes.
- [ ] Manual checks cover a partner with an existing Pixel and a partner without one.

## Report and branch

- Required report: `brain/agent-requests/antigravity/reports/AGR-20260809-004_meta_pixel_ui_acceptance_fix_DONE.md`.
- Suggested branch: `antigravity/AGR-20260809-004-meta-pixel-ui-acceptance-fix`.
- Do not merge AGR-20260809-003 before this follow-up is integrated into its effective PR diff.
