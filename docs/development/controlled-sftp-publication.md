# Controlled SFTP Publication

The PartnerHub administration service can publish a generated product-page package with:

```http
POST /api/internal/product-pages/publish
Content-Type: application/json

{
  "siteId": "jairo-pinto-test"
}
```

The endpoint is intended to run behind Cloudflare Access. It accepts only the generated site identifier and does not accept hosting credentials or destination paths from clients.

## Environment

Configure these values in EasyPanel for the `partnerhub` service:

```text
HOSTINGER_SFTP_HOST
HOSTINGER_SFTP_PORT
HOSTINGER_SFTP_USERNAME
HOSTINGER_SFTP_PASSWORD
HOSTINGER_SFTP_REMOTE_ROOT
```

`HOSTINGER_SFTP_REMOTE_ROOT` must be an absolute remote document-root path. For the initial test, it is the verified `public_html` directory for `jairopinto.pro`.

## Publication Behavior

1. The service checks that `/data/generated-sites/<siteId>` exists.
2. It recursively collects the generated files.
3. It uploads each file with a temporary remote filename.
4. It renames the temporary file into place.
5. It processes `index.html` last so that it only points to already uploaded assets.
6. It requests the public `https://{domain}/` and `https://{domain}/config.js` URLs.
7. It marks the linked activation lead as `VERIFIED` only when the public files match the saved source configuration.

The publisher does not delete files outside the generated package and cannot be pointed at a different remote directory from the API request.

## Response

On successful SFTP upload, the endpoint returns the published `siteId`, publication timestamp, verification timestamp, configured remote root, relative filenames published, `publicationState`, `verificationStatus`, and verification checks. It never returns credentials.

If the upload succeeds but verification fails, the endpoint still returns `201` with:

```json
{
  "publicationState": "VERIFY_FAILED",
  "verificationStatus": "VERIFY_FAILED"
}
```

The operator must treat that state as published but not ready for delivery.

## Manual Verification

Operators can verify a previously published page without re-uploading files:

```http
POST /api/internal/product-pages/verify
Content-Type: application/json

{
  "siteId": "jairo-pinto-test"
}
```

The verifier checks:

- homepage reachability
- `config.js` reachability and parseability
- `site.id` and `site.domain`
- distributor brand, full name, WhatsApp number, and purchase URL
- desktop and mobile hero URLs
- absence of `href="#comprar"` in the served HTML
- presence of `.product-btn-buy`
- presence of `config.js` and `app.js` script tags

The latest verification result is stored under `PRODUCT_PAGE_SOURCE_DIR/.verifications/<siteId>.json` and is included as `lastVerification` in `GET /api/internal/product-pages`.

## Follow-up

Antigravity can wire the admin dashboard to `verificationStatus`, show failed checks, and add the explicit `Verificar ahora` action.
