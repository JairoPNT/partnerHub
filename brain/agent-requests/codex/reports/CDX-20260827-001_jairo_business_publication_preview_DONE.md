# CDX-20260827-001 — DONE

## Resultado

Se implementó un maintenance workflow app-owned para preparar de forma aislada
el paquete local `jairo-pinto-business` y obtener el PREVIEW del publicador
guarded genérico. El workflow no contiene una ruta de publicación SFTP.

## Cambios

- PREVIEW read-only que fija fuente Business, PublishingTarget v2, fuentes
  protegidas Brand/Product, capability SFTP vigente, paquete master, snapshots
  locales, paquete existente y binding no secreto de conexión en un plan hash.
- Creación atómica de inputs para un nuevo capability probe con TTL de una hora.
- Preparación explícita protegida por mode, confirmation y plan hash.
- Generación Business mediante el servicio soportado dentro de un workspace
  aislado; las fuentes, activation leads, targets y snapshots autoritativos no
  son mutables por el generador.
- Instalación local recuperable con claim, backup/rename, re-PREVIEW tras la
  instalación y rollback del paquete previo ante drift o fallo pre-commit.
- Manifest y evidencia de preparación locales escritos atómicamente.
- Bundle Docker standalone del generador con shim limitado al marcador de
  compilación `server-only` de Next.js.

## Archivos

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/prepare-jairo-business-publication-preview.mjs`
- `app/web/scripts/prepare-jairo-business-publication-preview.test.mjs`
- `app/web/server/runtime/jairoBusinessPackageGenerator.ts`
- `app/web/server/runtime/serverOnlyRuntimeShim.mjs`
- `brain/agent-requests/codex/requests/CDX-20260827-001_jairo_business_publication_preview.md`
- Este reporte.

## Verificación

- Tests propios: 7/7 PASS.
- Guarded publication: 18/18 PASS.
- SFTP capability probe: 9/9 PASS.
- Ecosystem generation contract: 14/14 PASS.
- Total focalizado/regresión: 48/48 PASS.
- ESLint focalizado `--no-ignore --max-warnings=0`: PASS.
- Bundle standalone: PASS; export `generateJairoBusinessPackageIsolated`
  verificado mediante import real.
- Next.js production build y TypeScript: PASS; advertencia preexistente de
  inferencia de workspace/NFT en el worktree Windows.
- `git diff --check`: PASS.

## Git

- Base: `origin/main` `e9268e16c0e10f3ca75635960303858c30f9af98`.
- Rama: `codex/CDX-20260827-001-jairo-business-publication-preview`.
- Commit de implementación:
  `f1b4fe143f89f3220a93f89f7fcf9a448cc3c2c9`.
- El commit documental de cierre y el PR se registran en la entrega final.

## Seguridad y operaciones

- No se ejecutó EasyPanel, SFTP, provider, DNS, publicación ni mutación
  productiva.
- PREVIEW no crea adapter SFTP ni realiza provider calls.
- La preparación explícita solo modifica el paquete local allowlisted y sus
  inputs/claim propios; no publica contenido remoto.
- Brand, Product, apex y fuentes autoritativas permanecen fuera de la superficie
  de mutación.
- El capability probado anteriormente ya no debe asumirse vigente; tras deploy
  se requiere crear/revisar un PREVIEW nuevo y ejecutar un probe separado con
  autorización explícita.
- La publicación APPLY continúa siendo un gate posterior, separado y sujeto a
  un nuevo plan hash revisado.

## Follow-up

Sí. Tras merge/deploy:

1. Ejecutar el CAPABILITY_PREVIEW app-owned.
2. Autorizar y ejecutar el probe SFTP del plan revisado.
3. Ejecutar PACKAGE_PREPARATION_PREVIEW.
4. Autorizar PREPARE_PACKAGE_AND_PUBLICATION_PREVIEW.
5. Auditar el PREVIEW de publicación resultante antes de cualquier APPLY.
