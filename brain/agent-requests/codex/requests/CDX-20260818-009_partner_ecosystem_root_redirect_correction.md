# CDX-20260818-009 — Corrección de targets canónicos y redirect del dominio raíz

## Owner

Codex (Backend Lead).

## Dependencia

Follow-up obligatorio de `CDX-20260818-008` (`eb43609`). No abrir ni fusionar CDX-008 hasta integrar esta corrección.

## Problema detectado en auditoría

CDX-008 conserva la regla anterior: asigna el dominio raíz a un ecosistema y usa `producto.`/`negocio.`. La decisión arquitectónica vigente exige que todos los ecosistemas vivan siempre en subdominios y que la raíz solo redirija.

## Objetivo único

Corregir el contrato de entitlement para separar los `expectedTargets` canónicos de la decisión de `rootRedirectTarget`.

## Reglas obligatorias

1. Todos los ecosistemas publicados son subdominios:
   - `product.<dominio>` → `PRODUCT`.
   - `business.<dominio>` → `BUSINESS`.
   - `brand.<dominio>` → `PERSONAL_BRAND`.
2. Ningún ecosistema usa `role: ROOT`.
3. El dominio raíz no es un target de ecosistema; debe aparecer únicamente como origen del redirect.
4. Un solo ecosistema redirige la raíz a su subdominio.
5. Dos o más ecosistemas con Marca Personal redirigen la raíz a `brand.<dominio>`.
6. Dos o más ecosistemas sin Marca Personal redirigen la raíz a `product.<dominio>` como fallback estable.
7. No usar nombres en español (`producto`, `negocio`) para los hosts canónicos.

## Contrato esperado

Agregar un campo explícito, por ejemplo:

```ts
rootRedirectTarget: {
  ecosystemType: "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND",
  publicHost: string
} | null
```

`expectedTargets` debe contener todos los ecosistemas incluidos con `role: "SUBDOMAIN"` y sus hosts `product.`, `business.` o `brand.`. `rootEcosystem` puede conservarse como alias semántico del destino del redirect, pero no debe convertir ese ecosistema en target raíz.

## Alcance permitido

- `partnerEcosystemEntitlementCore.ts`.
- Pruebas del core y contrato de respuesta relacionado.
- Reporte/request DONE.

## Fuera de alcance

- Frontend.
- DNS, Hostinger, SFTP o publicación.
- Wompi, pagos, ledger o Prisma.
- Implementación física del redirect.

## Aceptación

- Producto individual: expected target `product.dominio`, root redirect a `product.dominio`.
- Business individual: expected target `business.dominio`, root redirect a `business.dominio`.
- Marca individual: expected target `brand.dominio`, root redirect a `brand.dominio`.
- Plan 360: tres subdominios y root redirect a `brand.dominio`.
- Producto + Business sin Brand: dos subdominios y root redirect a `product.dominio`.
- Legacy sin snapshot: `UNKNOWN`, sin ecosistemas inventados.
- Tests, ESLint backend, build y `git diff --check` aprobados.
