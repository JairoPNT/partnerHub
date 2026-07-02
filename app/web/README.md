# PartnerHub Web

Aplicacion Next.js del proyecto PartnerHub.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Auth.js / NextAuth draft
- Docker
- ESLint
- Prettier

## Estructura principal

- `app/` rutas, layouts y paginas
- `components/` UI compartida
- `modules/` catalogo de modulos y metadata
- `lib/` utilidades y constantes
- `server/` helpers de base de datos, auth y entorno
- `prisma/` esquema inicial
- `docs/` documentacion tecnica viva
- `scripts/` utilidades de mantenimiento

## Comandos

- `npm install`
- `npm run dev`
- `npm run build`
- `npm start`
- `npm run lint`
- `npm run format`
- `npm run db:generate`

## Despliegue

Easypanel debe apuntar al `Dockerfile` de la raiz del repositorio.
