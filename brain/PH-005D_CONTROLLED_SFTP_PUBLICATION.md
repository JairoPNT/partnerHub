# PH-005D Controlled SFTP Publication

Status: In Progress

## Objective

Publish an already generated product-page package from the PartnerHub service to one configured Hostinger document root through SFTP.

## Scope

- Add `POST /api/internal/product-pages/publish`.
- Publish only a package that already exists in `PRODUCT_PAGE_OUTPUT_DIR`.
- Read Hostinger connection data only from EasyPanel environment variables.
- Restrict the remote destination to `HOSTINGER_SFTP_REMOTE_ROOT`.
- Upload files to temporary names and replace `index.html` last.

## Security Constraints

- The browser request supplies only `siteId`.
- It cannot supply a hostname, remote path, username, or password.
- Secrets are never written to generated packages, manifests, responses, logs, Git, or frontend code.
- Cloudflare Access continues to protect the internal application hostname.
- The first configured destination is the verified Hostinger document root for `jairopinto.pro`.

## Required EasyPanel Variables

```text
HOSTINGER_SFTP_HOST
HOSTINGER_SFTP_PORT
HOSTINGER_SFTP_USERNAME
HOSTINGER_SFTP_PASSWORD
HOSTINGER_SFTP_REMOTE_ROOT
```

## Deferred

- UI publish control and status display belong to Antigravity after the backend route is verified.
- Multi-domain destination selection requires a server-side domain registry; it must not accept arbitrary paths from a browser request.
- Automatic deployment after generation is deferred. Publishing remains an explicit internal action.
- R2 uploads, custom domains, DNS provisioning, and n8n orchestration are out of scope.

## Verification Required Before Closure

1. Deploy the backend through EasyPanel.
2. Call the endpoint for `jairo-pinto-test` from the protected internal dashboard context.
3. Verify `https://jairopinto.pro` renders the newly published package.
4. Confirm no credentials appear in the response or service logs.
