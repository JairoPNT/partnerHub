# Internal Product Page Generation

`PH-005B` exposes a Node runtime route protected by the existing Cloudflare Access policy for `app.partnerhub.club`.

## Route

```text
POST /api/internal/product-pages/generate
```

The request body uses the same configuration structure as the static CLI generator. A successful request returns the generated site ID, timestamp, output directory, and file manifest.

## Persistent output

EasyPanel mounts the `partnerhub-generated-sites` volume at `/data`.

The container uses:

```text
PRODUCT_PAGE_OUTPUT_DIR=/data/generated-sites
```

For `site.id: "jenny-varela"`, the latest generated package is written to:

```text
/data/generated-sites/jenny-varela
```

The package contains `index.html`, `styles.css`, `app.js`, generated `config.js`, `tipografia/`, and `manifest.json`.

## Security boundary

This route is not a public client-page endpoint. It is intended only for the existing administration hostname guarded by Cloudflare Access. Automatic publishing to an external host is deliberately outside this increment.
