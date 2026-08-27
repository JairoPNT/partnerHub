# CDX-20260827-002 — DONE

## Resultado

Se implementó un maintenance workflow guarded para crear localmente el paquete
maestro `ganomaster-business` desde la plantilla Business canónica. PREVIEW no
escribe y APPLY no contiene ninguna ruta de red o publicación.

## Cambios

- PREVIEW determinístico que valida identidad BUSINESS, contactos/CTA maestros
  vacíos, VSL canónico, inventario de plantilla, destino y journal.
- Plan hash que fija la plantilla canónica y el hash esperado del paquete.
- APPLY separado por mode, confirmation y plan hash exacto.
- Claim propio, staging sibling privado, verificación por SHA-256 y rename
  atómico hacia `/data/generated-sites/ganomaster-business`.
- Rerun exacto `ALREADY_APPLIED`; destination, journal o claim drift bloquean.
- Plantilla canónica Business y maintenance script incluidos en el runtime
  Docker de producción.

## Archivos

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/jairo-business-master-package.mjs`
- `app/web/scripts/jairo-business-master-package.test.mjs`
- Request y este reporte.

## Verificación

- Tests propios: 7/7 PASS.
- CDX-20260827-001 publication preview: 7/7 PASS.
- Guarded ecosystem publication: 18/18 PASS.
- Ecosystem generation contract: 14/14 PASS.
- Total focalizado/regresión: 46/46 PASS.
- ESLint focalizado `--no-ignore --max-warnings=0`: PASS.
- PREVIEW real contra la plantilla canónica del repositorio: PASS.
- Next.js production build y TypeScript: PASS; únicamente warnings
  preexistentes de workspace/NFT.
- `git diff --check`: PASS.

## Git

- Base: `origin/main` `16afb035f971b4495adb07983222f3461f87312c`.
- Rama: `codex/CDX-20260827-002-business-master-package`.
- Commit de implementación: `0c88100`.
- Commit documental y PR se registran en la entrega final.

## Seguridad y operaciones

- No se ejecutaron EasyPanel, SFTP, Hostinger, DNS, HTTPS, publicación ni
  cambios productivos.
- APPLY solo puede crear el directorio maestro local allowlisted.
- Fuentes de Jairo, Brand, Product, PublishingTarget y apex quedan fuera de la
  superficie de mutación.
- Un fallo posterior a instalar el paquete conserva evidencia/claim para
  auditoría; no elimina automáticamente un resultado instalado.

## Follow-up

Sí. Tras merge/deploy:

1. Ejecutar PREVIEW del master.
2. Autorizar y ejecutar APPLY con el plan hash revisado.
3. Obtener un capability SFTP nuevo.
4. Repetir `PACKAGE_PREPARATION_PREVIEW` de CDX-20260827-001.
5. Autorizar la preparación local del paquete de Jairo y auditar el PREVIEW de
   publicación antes de cualquier APPLY remoto.
