# AGR-20261021-008 — DONE

- Owner: Antigravity/frontend, reparación acotada de configuración. Fecha: 2026-10-21.
- Base: `b27a659a411ff4ac4c43dd8d6677abf7490cd4f7`.
- Rama: `codex/AGR-20261021-008-business-master-neutral-cta`.
- Commit de implementación: `aee1930` (este reporte se registra aparte). Sin PR/push/merge.

## Cambio

Única modificación de producción: `plantillas-de-pagina/business/config.js` incorpora `cta.directRegisterUrl: ''`. Ninguna URL, registro ni navegación nueva. Todo otro contenido/configuración permanece intacto. Los cuatro assets ejecutables index/app/runtime/styles y los validadores/registry no cambiaron respecto a base.

Nuevo `app/web/scripts/business-template-master-readiness.test.mjs`: dos regresiones que copian íntegramente la plantilla actual a `mkdtemp`, sin reescribir CONFIG. Ejecutan los exports reales plan/apply de create y refresh desde procesos CLI Node20 con output/template/jobs explícitos bajo temp. Refresh reconstruye exclusivamente el paquete histórico desde Git y comprueba sus hashes allowlisted, sin sanear la plantilla actual. Cada resultado queda APPLIED/unblocked con config idéntica byte a byte y datos de identidad/contacto/CTA neutrales. Solo I/O temporal local; no red/proveedores/SFTP/publicación/clientes reales.

Otros archivos: request propio actualizado y este reporte. No archivos fuera de límites ni staging ignorado.

## Verificación

Ejecutable exacto (`NODE20` como abreviatura documental): `C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/tooling/node20/node-v20.20.2-win-x64/node.exe` (v20.20.2).

- RED antes del cambio: `NODE20 --test app/web/scripts/business-template-master-readiness.test.mjs` desde raíz. Exit 1; 0 pass/2 fail; create: `BUSINESS_CANONICAL_MASTER_CTA_NOT_EMPTY:directRegisterUrl`; refresh: `BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_CTA_NOT_EMPTY`.
- GREEN mismo comando después de añadir solamente la propiedad: exit 0; 2 pass/0 fail/0 skip. Repetido tras imports explícitos de Buffer/process para lint: mismo resultado.
- Suite existente una vez: `NODE20 --test app/web/scripts/jairo-business-master-package.test.mjs app/web/scripts/jairo-business-master-package-drift-recovery.test.mjs app/web/scripts/business-master-runtime-packaging.test.mjs`: exit 0; 62 pass/0 fail/0 skip.
- `NODE20 --check plantillas-de-pagina/business/config.js`: exit 0.
- Desde `app/web`: `NODE20 node_modules/eslint/bin/eslint.js --no-ignore scripts/business-template-master-readiness.test.mjs`: exit 0, sin warnings. Invocación inicial desde raíz tenía ruta equivocada; la configuración ignora scripts por defecto; `--no-ignore` detectó globals de Node y se corrigieron con imports explícitos, sin excepciones de reglas.
- `git diff --check` y diff staged: sin errores. Diff de los cuatro assets ejecutables contra base: vacío. Revisión propia: config +1 línea, sin cambios ajenos.

## Build, riesgos y follow-up

Build completo no ejecutado ni afirmado; reparación de datos/standalone MJS, verificada por sintaxis, dos regresiones y suite local relevante. No se ejecutó suite global ni se afirma readiness productiva. Las entradas main del CLI no permiten override de templateDirectory, por eso el ensayo CLI usa `--input-type=module -e` y exports reales con rutas explícitas (sin modificar entrypoints).

Requiere revisión independiente e integración por CDX006. No hace falta otro request de implementación si esa revisión acepta. Sin aprobación de publicación, fuente ni registry real; configuración vacía no significa enlace de registro disponible.
