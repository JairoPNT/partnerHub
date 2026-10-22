# CDX-20261021-010 — Validación Linux y comprobación live de solo lectura

2026-10-22. Owner Codex backend. Complementa el informe OFFLINE_IMPLEMENTATION; no sustituye sus límites ni acredita publicación. Código revisado82f960a, árbol Git ensayado179131e14229f6b41eb871516afaa1ac7ac9a8a5. PR238: https://github.com/JairoPNT/partnerHub/pull/238 .

## Resultado

**Gate Linux aislado PASS, aceptado por revisión independiente.** Habilita integrar el protocolo retrocompatible por sí solo; no BEGIN, migración009, reapertura ni publicación. El bloqueo dejó de ser la ausencia de Docker. La integración009/current-profile/verificador fijo sigue sin implementar y debe conservar su ticket/branch/owner separado conforme al plan aprobado.

## Evidencia fresca

- Docker desktop-linux local29.7.2, Desktop4.87.0, Linux/WSL2. Contexto construido por git archive HEAD, sin .env real, secretos, node_modules ni scratch ignorado. Dockerfile productivo sin cambios, build exit0, Next39/39. Imagen runner/index `sha256:104321ae18e6894497ebd0151d86c7998300eb1c17c5c81b46f34a51fd348f45`, linux/amd64 manifest `sha256:7e87b02388ab164f2c436bcd7ed289f66d7c8cfec77f8dbd408113cebcfd04e5`.
- Node20.20.2 real: CLI enviado en runner, exports exactos, diez argumentos negativos, STATUS npm y snapshots de no escritura. Packaging4/4, cero skips. Suite TS separada con Node24.22.1:44/44, cero skips. No se confunden ambos runtimes ni se suman drivers de assertions a esos conteos.
- Dos contenedores distintos ejecutaron A/B como proceso principal Node20, UID1000, ambos exit0. Misma identidad física del output en volumen nombrado temporal; raíz y ancestro /data distintos. BEGIN/drenado/MIGRATION_STARTED, fin de lock administrativo sin abrir cierre global, resume genuino en B y writer bloqueado. Suplemento root registrado aparte.
- POSIX0700/0600 y UID;18 fsync de directorio y9 de archivo exitosos tras invocar el sync real; once negativos de sustitución/link/permisos/UID conservan cierre/evidencia. SIGKILL137 deja cierre y lock administrativo huérfano; lector nuevo BLOCKED sin apropiación.
- Runtime de ensayo sin red, puertos, privileged, socket Docker ni bind de datos reales. Eliminados13 contenedores/6 volúmenes propios con nombre+label comprobados; fixtures desechables no recuperables salvo regeneración con harness. Scratch, logs, imágenes y harness conservados. No se eliminó historia productiva.

Fallos iniciales conservados y reruns completos: packaging3/4 por Dockerfile ausente en builder de tests, completado con el Dockerfile archivado sin modificar y4/4; TS43/44 por basename node24 en texto literal de warning, mismo binario con basename node y44/44; driver PowerShell con -join mal parentizado, corregido solo en scratch y par A/B nuevo. No hubo waiver ni cambios de código/tests para pasar.

Evidencia ignorada en `.local-secrets/sdd/CDX-20261021-010/linux-report.md` y `linux-evidence-review.md`; scratch `C:/Users/jairo/AppData/Local/Temp/cdx010-linux-fa9ff15ed8c043f1a5d72a77207656bb`. El reviewer inspeccionó logs, hashes, harness y manifests, sin repetir suites/build. Dictamen PASS, cero Critical/Important; minor aceptado: algunos encabezados iniciales argv quedaron System.Object[], aunque scripts/logs/manifests y el par decisivo tienen evidencia suficiente. Registrar argv normalizados antes de futuras pruebas, no repetir este ensayo por esa mejora.

## Límites revisados por el controller

El build reportó22 advisories npm de la app (3moderate/18high/1critical),0 del runtime SFTP y2 warnings NFT. No se diagnosticó exploitabilidad ni se remediaron/dispensaron advisories: PASS funcional no es certificación de seguridad. La cobertura de todos los bundles cooperantes del release compuesto, storage-driver productivo, exclusión de operadores/scripts ajenos, retiro de tareas y reapertura pertenecen a la integración dependiente. No se descartan: son condiciones de esa entrega. No resistencia a root/mismoUID hostil ni garantía de durabilidad ante corte eléctrico real. STATUS enviado sí fue ejecutado; no se afirma prueba independiente de cada bundle Next enviado.

## Comprobación live, solo lectura

Se reutilizó Chrome autenticado existente. EasyPanel Actions confirma PR237 **Success 2026-10-22T02:55:39Z**. Consola Sh a13:57:14.918Z: Node20.20.2/linux UID/GID0, output canónico, herramienta009 presente y STATUS010 ausente. `.master-package-claims`0700 UID0; claim global/operaciones010/namespace de sitio ausentes en esa lectura; master0700 UID0 sin measurement-runtime.js. No se cambió chmod, configuración ni dato. Una tarea visible no demuestra retiro global de otras tareas.

Claudia pública recargada: hero/promesas anteriores, CTA Registrarme hacia WhatsApp, navegación Casos de Éxito, video3/10min y FAQ8–12h anterior. Hay botón de preferencias y copy de privacidad, pero no basta para acreditar el release/consentimiento aprobado. Se observaron loaders GA4/Meta heredados; sin clicks de aceptación/contacto/video ni verificación de recepción de eventos. No se afirma ausencia total de markup de consentimiento ni cero ejecución de tracking heredado al cargar la página. No se activaron tags nuevos.

GitHub:238 OPEN/DRAFT en179131e al comprobar;235 OPEN/DRAFT en82b6c5d con conflictos contra main. El sucesor se compone con protocolo e integración; no desplegar la imagen histórica235 sola. Detalle local en live-readonly-20261022.md e integration-assessment.md.

## Siguiente gate

Conectar capacidad/controlador reales al lifecycle009 reteniendo el mismo claim; captura current-profile y verificación fija post-deploy distinta de la captura estricta dentro de transacción; cancelación solo antes de MIGRATION_STARTED y reapertura solo con código/master/auditoría exactos. Mismo grafo de módulos para capacidades WeakMap; no JSON/flags/hash declarados como autoridad. Mantener APIs públicas009 bloqueadas. Acordar diseño escrito/plan de esa integración antes de implementarla; la ventana de mantenimiento ya está autorizada y no se vuelve a solicitar.

Después: composición235+protocolo+integración, evidencia real de tareas/volumen/lineage/plan, corte seguro y generación/publicación de Claudia por flujo existente, validación pública móvil/escritorio de copy/CTA/VSL/FAQ/consentimiento. DNS/campañas excluidos. **Claudia no actualizada por estas validaciones.**
