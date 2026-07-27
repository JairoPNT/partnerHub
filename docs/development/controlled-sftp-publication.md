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

The publisher does not delete files outside the generated package and cannot be pointed at a different remote directory from the API request.

## Response

On success, the endpoint returns the published `siteId`, timestamp, configured remote root, and the relative filenames published. It never returns credentials.

## Follow-up

After the route is verified in production, Antigravity can add an explicit publishing control to the internal landing-builder interface.
