# PH-007F Public and admin host separation

Status: Application routing implemented; Cloudflare hostname configuration pending

## Hosts

- `app.partnerhub.club`: administrative dashboard.
- `oferta.partnerhub.club`: public beta offer and activation form.

## Application behavior

- Requests to `https://oferta.partnerhub.club/` are internally rewritten to `/oferta-beta`.
- Requests to `https://app.partnerhub.club/oferta-beta` redirect to the public host.
- The public page remains outside the `(app)` layout, so it does not render the dashboard sidebar or top bar.

## Infrastructure handoff

Cloudflare Tunnel must publish `oferta.partnerhub.club` to the same PartnerHub service and port currently serving `app.partnerhub.club`. The existing `app.partnerhub.club` route remains unchanged.

This separates the visual entry points but does not replace authentication. The admin host must receive the project's authentication/authorization hardening before being considered private.
