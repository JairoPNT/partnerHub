# PH-006A Partner Onboarding Agreement and Consent

Status: In Progress

## Objective

Create the technical and legal-document structure for onboarding an entrepreneur before generating or publishing a PartnerHub product page.

This document is a product and engineering specification. It is not the final legal agreement and must be reviewed by Colombian counsel before activation.

## Agreement Scope

The entrepreneur accepts a versioned agreement covering:

- product-page service, setup price, monthly support price, payment timing, suspension, and cancellation;
- MVP template, support, hosting administration, maintenance, and iterative improvements;
- Jairo Pinto acting as a natural person and service provider at this stage;
- domain, hosting, VPS, R2, source template, and PartnerHub administration remaining under the provider's control;
- entrepreneur ownership of their supplied name, logo, photographs, copy, and other original materials;
- permission to reproduce, resize, adapt, and publish supplied media only for the agreed pages and service;
- technical handoff as an alternative that ends the PartnerHub service for that page, with the entrepreneur assuming full administration;
- optional future custom development under a separate quotation and agreement;
- proposed improvements being evaluated for possible inclusion in the shared template, without automatic implementation or exclusivity;
- domain non-transfer, renewal responsibility, notice period, and post-expiry release process;
- export of the entrepreneur's own supplied assets and a generated-page backup when a handoff or service termination applies;
- no guarantee of leads, sales, or a specific commercial result.

## Confirmed Commercial Timing

- The one-time installation fee is paid in full before work begins.
- Publication is scheduled within 24 to 48 hours after payment and receipt of the required information and assets.
- Support is paid monthly in advance.
- A five-calendar-day grace period applies after the support due date. After that period, the service may be suspended under the final agreement and applicable notices.
- The support due date is the same calendar day on which the service starts each month.
- A reminder is sent three days before the due date, another on the due date, and a further notice on the third day of arrears.
- Suspension may occur after the fifth day of grace. Reactivation requires receipt of the outstanding payment.
- Support suspension does not automatically release the domain; domain expiry and release are handled separately under the final agreement.
- The final agreement must still state the exact plan price, due date, notice method, and restoration conditions.

## Separate Authorizations

The form must keep these acceptances distinct:

1. Agreement to the paid service terms.
2. Authorization to process the entrepreneur's personal data.
3. Permission to publish and adapt supplied images, logo, name, and copy.
4. Optional permission for PartnerHub to show the page as a portfolio or case study.

The portfolio permission must not be bundled into the service authorization. A refusal must not prevent delivery of the contracted page.

## Evidence to Preserve

For each acceptance, preserve an immutable snapshot containing:

- agreement version and exact text snapshot;
- acceptance purpose and checkbox values;
- entrepreneur identity and contact data submitted at the time;
- typed full-name signature and optional drawn signature;
- UTC timestamp and server timestamp;
- IP address and user agent, subject to the final privacy policy;
- generated PDF path and SHA-256 hash;
- actor and source context, such as dashboard invitation or internal onboarding.

Do not store signatures or identity documents in public R2 paths. Keep evidence in private application storage with restricted access and retention rules.

## Product-Page Data Required After Acceptance

- entrepreneur identity and legal contact;
- sales country selected from the approved territory list;
- complete purchase URL supplied by the entrepreneur;
- WhatsApp number, call number, and display number separately;
- hero desktop and mobile assets;
- logo mode and optional logo image;
- favicon upload or generated initial;
- content and asset-use permissions.

## WordPress Reference Mapping

The reference plugin's waiver repository and PDF generator provide useful patterns for snapshots, signatures, audit metadata, protected files, and hashes. WordPress nonces, `$wpdb` repositories, shortcodes, uploads paths, and admin-post handlers are not portable and must be replaced by PartnerHub authentication, server-side validation, Prisma-backed records, and private storage.

## Legal Review Gates

- Confirm service-provider identity and address details for Jairo Pinto.
- Confirm the final scope, prices, taxes, payment terms, renewal, cancellation, and handoff fees if any.
- Confirm the domain expiry, notice, grace-period, and release wording.
- Confirm the image and logo license scope, duration, territory, media, adaptation rights, and revocation rules.
- Confirm the data-treatment policy, rights-request channel, retention, processors, and cross-border hosting disclosures.
- Replace any statement of Gano Excel approval with documented wording unless written approval exists.
