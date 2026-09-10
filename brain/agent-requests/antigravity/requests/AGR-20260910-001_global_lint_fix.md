# AGR-20260910-001 — Global Lint Fix

## Dependencia

Ninguna. Basado en `origin/main` actualizado.

## Objetivo

Corregir todos los errores y warnings pendientes reportados por `npm run lint` en el repositorio PartnerHub, alcanzando 0 errores y 0 warnings sin alterar el comportamiento en runtime ni los contratos existentes.

## Alcance

- `app/web/components/partners-referrals-view.tsx`
- `app/web/components/personal-brand-blocks-view.tsx`
- `app/web/lib/ecosystem-contracts.ts`
- `app/web/server/types/publication-runtime-modules.d.ts`

## Cambios requeridos

- Eliminar imports y variables no utilizados.
- Reemplazar tipos `any` explícitos por tipos seguros/desconocidos (`unknown`, interfaces concretas o genéricos apropiados).
- Mantener intactos el diseño/UX, lógica de negocio y APIs.

## Fuera de Alcance

- Prohibido modificar `server/services/**`.
- Prohibido modificar APIs, Prisma, auth, Docker, DNS, Hostinger, Cloudflare, EasyPanel o configuración de producción.

## Criterios de Aceptación

- `npm run lint` en `app/web` retorna 0 errores y 0 warnings.
- Pruebas, build y `git diff --check` aprobados.
- Rama `antigravity/AGR-20260910-001-global-lint-fix`.
- PR abierto listo para auditoría.
