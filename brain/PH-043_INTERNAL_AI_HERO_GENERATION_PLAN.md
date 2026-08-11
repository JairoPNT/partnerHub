# PH-043 - Internal AI hero generation plan

## Decision

PartnerHub will generate partner hero images through an internal Python service and the OpenAI Images API. The workflow will not depend on n8n.

The service will consume the original onboarding photos already stored in Cloudflare R2, create operator-reviewable drafts, normalize approved outputs to the product template dimensions, and store the resulting WebP assets back in R2. Generation and publication remain separate operations.

## Current evidence

- Public onboarding uploads source photos through `mediaUploadService.uploadSourcePhoto`.
- Source assets use `onboarding/{token-prefix}/fotos/negocio-{version}.webp` keys in R2.
- Their public URLs are persisted in `onboardingData.sourcePhotos`.
- The internal activation-lead read model already returns `onboardingData.sourcePhotos`.
- Final Product heroes remain separate fields: `heroDesktopUrl` and `heroMobileUrl`.
- The administrative partner view does not currently expose the stored source photos.

## Data distinction

- `sourcePhotos`: originals supplied by the partner and authorized for image production.
- Hero drafts: generated candidates that are not yet part of a public site.
- `heroDesktopUrl`: approved desktop hero.
- `heroMobileUrl`: approved mobile hero.

Source photos must never satisfy final hero completeness by themselves. Drafts must never be published automatically.

## Delivery order

Each item is an independent ticket with one owner and one verifiable result.

1. `AGR-20260811-001`: expose existing source photos in the partner administrative record.
2. Follow-up frontend ticket: correct hero completeness using final saved/generated configuration without conflating source photos and heroes.
3. Backend ticket: define the generation-job contract, statuses, audit fields, consent rules and retry budget.
4. Backend/infrastructure ticket: implement the Python OpenAI worker for one desktop draft.
5. Validation ticket: evaluate desktop identity and composition with three authorized partners.
6. Backend ticket: add the related mobile draft and deterministic Pillow normalization.
7. Frontend ticket: source selection, prompt presets, generation progress, preview, approve and reject controls.
8. Integration ticket: persist approved R2 URLs into partner hero fields and verify regeneration without automatic publication.

## Generation constraints

- OpenAI credentials are server-only and live in EasyPanel.
- Only R2-owned source URLs may be fetched by the worker.
- `imageUseConsent` must be true before a generation job can start.
- Desktop and mobile are separate compositions derived from the same approved source set and controlled creative brief.
- Pillow produces the exact final dimensions, WebP encoding and maximum file size.
- The operator approves drafts before hero URLs are updated.
- Publication remains an explicit existing action.
- Every attempt records model snapshot, prompt-template version, resolved parameters, status, cost/usage metadata and error details.

## Out of scope for the first ticket

- OpenAI API calls.
- Python service or deployment changes.
- Database or storage migrations.
- Generated drafts.
- Hero completeness changes.
- Automatic publication.

