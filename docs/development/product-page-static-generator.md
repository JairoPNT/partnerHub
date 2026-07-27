# Product Page Static Generator

`PH-005A` creates a static, publish-ready product-page package from one entrepreneur JSON configuration.

## Generate a package

From the repository root:

```powershell
node scripts/generate-product-page.mjs `
  --input examples/product-page/jairo-pinto-test.json `
  --output tmp/generated-sites/jairo-pinto-test `
  --force
```

The output contains only the files that belong in the hosting document root:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `tipografia/`

Common product media and the client hero files continue to load from R2. Do not copy the template `images/`, `videos/`, or `configs/` folders into a published package.

## Input contract

Required fields:

- `site.id`: lowercase slug, for example `jenny-varela`.
- `site.title`.
- `distributor.brandName`, `firstName`, `fullName`, and `whatsappNumber`.
- `hero.desktop` and `hero.mobile`: public HTTPS R2 URLs.

The generator supplies conservative defaults for the remaining site metadata and contact fields.

## Current boundary

Generation is local and explicit. Uploading to Hostinger remains a manual approval step. No hosting credential, API, database, or dashboard UI is involved in this ticket.
