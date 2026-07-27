# PH-005B - Internal Product Page Generation Service

## Status

In progress.

## Objective

Run the product-page generator inside `app.partnerhub.club` and write the latest package for each entrepreneur to persistent EasyPanel storage.

## Infrastructure Contract

- EasyPanel volume: `partnerhub-generated-sites`.
- Container mount: `/data`.
- Generated package root: `/data/generated-sites/<site-id>`.
- Template source in container: `/app/plantillas-de-pagina/producto`.

## Scope Boundary

- The route is intended for the existing Cloudflare Access-protected administration hostname.
- No dashboard form changes.
- No database records.
- No automatic publication to Hostinger.
- No SFTP or SSH credentials.
- No public client-site hosting from the VPS.

## Acceptance Test

Build the Docker image, invoke the internal route with a valid configuration, and verify the generated package appears under the mounted volume path.
