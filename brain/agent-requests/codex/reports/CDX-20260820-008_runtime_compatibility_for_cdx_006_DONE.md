# CDX-20260820-008 — Reporte DONE

## Estrategia

El Dockerfile raíz ahora transporta únicamente `plantillas-de-pagina/personal-brand/config.js` desde el contexto canónico del repositorio hacia `/app/runtime-assets/personal-brand-config.js`. No se duplica ni reescribe el contenido en código y no se empaqueta el resto de la plantilla Personal Brand.

El comando resuelve por defecto esa ruta exacta. Para pruebas u otro runtime controlado admite `PRODUCT_PAGE_BRAND_TEMPLATE_CONFIG`; no vuelve a depender de `/app/plantillas-de-pagina`. El Dockerfile también copia explícitamente el script CDX-006 a `/app/scripts/`, haciendo reproducible lo que ya se observó en el deploy.

## Garantías preservadas

- Solo DRY_RUN; APPLY continúa sin implementación.
- `changed: false`.
- Hash obligatorio de la fuente real.
- Backup de fuente, verificación e historial encontrados.
- Proyecciones Product/Brand únicamente bajo `.migration-audits`.
- Brand se deriva del `CONFIG` canónico empaquetado, no de placeholders inventados en el script.
- Bloqueo ante drift, identidad inválida y destino Product preexistente.
- Sin writes en `.sources` o `.publishing-targets` y sin integraciones de proveedor.

## Artefacto runtime

- Origen build: `plantillas-de-pagina/personal-brand/config.js`.
- Destino imagen: `/app/runtime-assets/personal-brand-config.js`.
- Consumidor: `/app/scripts/claudia-source-identity-dry-run.mjs`.
- Variable opcional: `PRODUCT_PAGE_BRAND_TEMPLATE_CONFIG`.

El artefacto conserva el mismo hash de bytes que el archivo canónico en el commit. Docker falla en build si el origen no existe, evitando una imagen con identidad Brand inventada o vacía.

## Comando EasyPanel posterior al deploy

Desde `/app`:

```sh
npm run maintenance:claudia-source-identity-dry-run -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260820-006/manifest.json
```

Preflight read-only opcional para confirmar empaquetado:

```sh
sha256sum /app/runtime-assets/personal-brand-config.js
```

Debe coincidir con `plantillas-de-pagina/personal-brand/config.js` del commit desplegado.

## Verificación

- Pruebas focalizadas: incluyen runtime sin `plantillas-de-pagina` y artefacto mínimo bajo `runtime-assets`.
- ESLint focalizado, build y `git diff --check`: requeridos y registrados en la entrega.
- `npm run build`: PASS. La construcción local de la imagen Docker no pudo ejecutarse porque el host no tiene el binario `docker`; el Dockerfile queda verificable en CI/deploy y sus dos `COPY` usan rutas estáticas.
- PR/deploy/DRY_RUN productivo: no ejecutados.

## Archivos

- `Dockerfile`
- `app/web/scripts/claudia-source-identity-dry-run.mjs`
- `app/web/scripts/claudia-source-identity-dry-run.test.mjs`
- request y reporte CDX-008.

## Riesgos y autorizaciones

- Todo cambio posterior al `config.js` canónico exige rebuild/deploy para actualizar el artefacto runtime.
- Se requiere auditoría antes de abrir PR.
- Después del merge se requiere autorización de deploy y, separadamente, autorización para repetir el DRY_RUN.
