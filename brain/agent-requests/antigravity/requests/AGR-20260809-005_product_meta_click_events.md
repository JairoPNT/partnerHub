# AGR-20260809-005 - Product Meta click events

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- PH-040A Meta Pixel base code is merged and deployed.
- The Producto template already resolves WhatsApp links through `data-wa-action` and purchase links through `.product-btn-buy`.
- This request is limited to the canonical Producto template and does not depend on the pending multi-ecosystem generator correction.

## Single outcome

Emit two truthful Meta custom click events from the canonical Producto template when a configured Meta Pixel is available.

## Events

### WhatsApp

```js
fbq("trackCustom", "WhatsAppClick", {
  funnel: "productos",
  destination: "whatsapp"
});
```

Emit only when the activated anchor is a functional Producto WhatsApp action represented by the template's existing `data-wa-action` contract and resolves to a valid `https://wa.me/` destination.

### Store

```js
fbq("trackCustom", "StoreClick", {
  funnel: "productos",
  destination: "ganoexcel_store"
});
```

Emit only when the activated anchor is an enabled `.product-btn-buy` link with a configured HTTPS purchase destination.

Do not hardcode `https://col.ganoexcel.com/`. Purchase URLs are partner-specific and the template's `.product-btn-buy` contract is the authoritative purchase action.

## Implementation requirements

- Implement inside `plantillas-de-pagina/producto/app.js`; do not paste a separate inline `<script>` into `index.html`.
- Use delegated click handling so dynamically configured `href` values continue to work.
- Safely handle click targets that are not `Element` instances before using `closest`.
- Call Meta only when `typeof window.fbq === "function"`; sites without a configured Pixel must remain unaffected.
- Initialize the listener exactly once, even if initialization code is called more than once.
- Do not prevent navigation, change destinations, delay clicks, or alter existing WhatsApp/purchase behavior.
- Do not include phone numbers, names, email addresses, messages, purchase URLs, or other personal data in event parameters.
- Preserve the exact event names `WhatsAppClick` and `StoreClick` and the approved `funnel` / `destination` parameters above.

## Accuracy boundaries

- These are click/intention events, not confirmed leads or purchases.
- Do not emit `Lead`, `Purchase`, or `ViewContent` in this ticket.
- Do not rename `StoreClick` to `Purchase`.
- A WhatsApp click is not proof that a message was sent.
- A store click is not proof that an order or payment completed.

## Allowed files/modules

- `plantillas-de-pagina/producto/app.js`
- Matching completion report.

## Excluded files/modules

- `plantillas-de-pagina/producto/index.html`
- `config.js`, `styles.css`, and all other template ecosystems.
- Generated master or partner output directories.
- Dashboard, API, backend, generator, publication, verification, auth, database, Docker, Easypanel, and dependencies.

## Explicitly out of scope

- No live master regeneration or publication.
- No partner replication.
- No Meta API, Conversions API, OAuth, or access token.
- No standard Meta `Lead`, `Purchase`, or `ViewContent` events.
- No analytics UI changes.
- No consent-management changes.

## Parallel safety

- Safe beside `AGR-20260809-002` because it edits different files.
- Safe beside PH-041A only if PH-041A does not modify canonical template files.
- If another active task is editing `plantillas-de-pagina/producto/app.js`, stop and report the overlap.

## Verification

- `node --check plantillas-de-pagina/producto/app.js`.
- Targeted lint or the closest available static validation for the template script.
- `npm run build` from `app/web`.
- Manual browser verification with a stubbed `window.fbq`:
  - one WhatsApp click emits exactly one `WhatsAppClick`;
  - one enabled purchase click emits exactly one `StoreClick`;
  - unrelated links emit nothing;
  - disabled/unconfigured purchase buttons emit nothing;
  - missing `window.fbq` causes no error and navigation remains unchanged.
- Confirm no inline Pixel ID or partner data is added to the template.

## Operational follow-up after merge

1. Regenerate the Producto master from the updated canonical template.
2. Preview and publish the Producto master.
3. Replicate/regenerate each Producto partner page from the new master.
4. Publish those partner pages.
5. Validate events through Meta Events Manager test events or Meta Pixel Helper.

These production operations are not authorized inside this frontend request.

## Report and branch

- Required report: `brain/agent-requests/antigravity/reports/AGR-20260809-005_product_meta_click_events_DONE.md`.
- Suggested branch: `antigravity/AGR-20260809-005-product-meta-click-events`.
