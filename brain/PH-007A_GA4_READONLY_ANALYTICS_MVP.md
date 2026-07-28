# PH-007A Read-only GA4 Analytics MVP

Status: Configured for first test

## Scope

PartnerHub will show traffic and acquisition metrics for each product page. The MVP does not calculate ROI or ROAS and does not collect advertising spend. Campaign profitability belongs to a later, separately activated advertising module.

## First test property

- Site: `jairo-pinto-test`
- Test URL: `https://jairopinto.pro`
- GA4 property/stream: `jairo-pinto-test`
- Web stream ID: `15341728226`
- Measurement ID: `G-7F24PBZPDM`

The Measurement ID is public configuration and may be embedded in the published static page. API secrets, service-account keys, and OAuth credentials must never be stored in the template or exposed to the browser.

## Planned MVP metrics

- Users and sessions.
- Page views and engagement.
- Country and acquisition source/medium.
- Campaign, term, and content from UTM parameters.
- Device category.
- Click events for WhatsApp, calls, and purchase links.

## Isolation and integration

Each site receives its own GA4 property or web stream mapping. The PartnerHub backend must map `siteId` to the approved GA4 property and enforce tenant-level access before querying the Google Analytics Data API. The dashboard is read-only for this phase.

Before activation, the generated static template must receive the site's Measurement ID through its validated configuration and the onboarding agreement must include the applicable analytics notice and consent language.

## Editing relationship

The product-page generator stores the validated source configuration in the durable service volume. A future dashboard editor can load it by `siteId`, update fields such as contact details, heroes, purchase URL, or Measurement ID, and regenerate the package. Regeneration does not publish automatically; publication remains an explicit reviewed action.
