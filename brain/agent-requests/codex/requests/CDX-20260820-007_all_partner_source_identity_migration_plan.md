# CDX-20260820-007 — Plan DRY_RUN de identidad para todos los partners

## Dependencia

CDX-006 validado en producción sin APPLY.

## Objetivo

Inventariar y proyectar identidades canónicas para los seis partners, con exactamente uno allowlisted por ejecución y sin modificar estado productivo.

## Convención

- `<slug>` → PERSONAL_BRAND → `brand.<dominio>`
- `<slug>-product` → PRODUCT → `producto.<dominio>`
- `<slug>-business` → BUSINESS → `negocio.<dominio>`

Un ecosistema redirige el apex a su subdominio. Dos o más redirigen a Brand. El apex nunca es PublishingTarget.

## Límites

Solo DRY_RUN/read-only más backup de auditoría. Sin APPLY, `.sources`, `.publishing-targets`, DNS, Hostinger, publicación, regeneración, pagos, ledger, masters o UI.
