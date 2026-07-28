# PH-007B Product Page Edit and Republish

Status: Backend ready for dashboard integration

## Objective

Allow an internal operator to load a generated product page by `siteId`, edit its validated source configuration, regenerate the static package, review the result, and explicitly publish it.

## Backend contract

- `GET /api/internal/product-pages` lists saved site configurations.
- `GET /api/internal/product-pages/:siteId` loads one saved configuration.
- `PATCH /api/internal/product-pages/:siteId` validates the edited generation payload, regenerates the package, stores the new source configuration, and returns `requiresPublication: true`.
- `POST /api/internal/product-pages/publish` remains a separate explicit action.

The PATCH route forces the URL `siteId` to be authoritative and ignores a conflicting ID in the request body. Regeneration never publishes automatically.

## Storage decision for MVP

Source configurations are stored as private JSON files under `PRODUCT_PAGE_SOURCE_DIR`, defaulting to `/data/generated-sites/.sources`. This keeps source data out of the public static package and uses the durable EasyPanel volume while the broader tenant/database onboarding model is still being stabilized.

The source directory is an interim MVP persistence layer. A later migration may move these records into Prisma once the authenticated entrepreneur/channel relationships are active in production.

## Editor fields

The dashboard editor should load and edit the current configuration, including contact details, SEO, heroes, and the optional GA4 Measurement ID. The final customer never receives access to this internal editor.
