# CDX-20261021-009 — Transición versionada del master Business

Estado: APROBADO por Jairo el 2026-10-21 para implementación y pruebas offline. NO ejecutar en producción. Owner: Codex backend; revisión independiente premium por integridad/auditoría y concurrencia.

## Resultado único y motivo

Preparar una herramienta de migración guardada desde el master pre-consentimiento conocido `9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046` hacia los bytes revisados del release235, manifest canónico `negocio.ganomaster.pro`, conservando ID ganomaster-business. Diagnóstico real suministrado por Jairo: el paquete actual coincide con el esperado por el refresh antiguo; sus rutas de auditoría/respaldo ya existen. No se debe repetir ni forzar esa operación e9a2->9760.

## Contrato propuesto

- Perfil fijo de versión/ticket, sin hash/identidad/ruta arbitrarios de aprobación desde usuario/env/HTTP. Reutilizar el ciclo guardado existente, no duplicar800líneas ni relajar la allowlist histórica.
- Validar paquete9760, manifiesto/tree exactos y cadena completa: apply original, refresh anterior y respaldoe9a2 por sus bytes/hashes. Una bandera present=true no acredita integridad. Pin de todos esos bytes en PREVIEW determinista y nueva autorización de plan; revalidación antes de instalar.
- Nuevo respaldo/auditoría inmutables bajo ID nuevo. Archivos históricos intactos byte por byte; host inglés retenido solo en historia. Sucesor incluye runtime/cache/manifest revisados, hashesLF exactos, proveedores false. Rechazar archivos extra, symlinks, CRLF/unreviewed, drift/claims/jobs/paths ambiguos.
- PREVIEW/readback sin mutaciones; APPLY solo con confirmación+hash fresco, exclusión efectiva de escritores Business y propiedad demostrada del claim. Readback ALREADY_APPLIED solo si nuevo paquete+auditoría+respaldo íntegros coinciden.
- No asumir que cero RUNNING jobs basta: generación directa/coordinador por sitio no respetan actualmente el claim global. Para ejecutar habrá que probar ventana de mantenimiento que excluya TODOS los escritores Business o aprobar ticket separado de handshake/barrera; no añadirlo silenciosamente aquí.
- No llamar generación canónica como atajo: borra/recrea output y altera fuentes/history/estado, no crea la cadena de respaldo requerida. No afirmar intercambio de directorios crash-atómico; las dos renames tienen intervalo y rollback es limitado/condicionado a propiedad+hash. Ambigüedad conserva claim/evidencia.

## Límites y entrega

- Allowed previstos tras aprobar: CLI versionada nueva y tests; parametrización mínima del ciclo en jairo-business-master-package-drift-recovery.mjs o extracción única de helpers; empaquetado runtime/package scripts y pruebas correspondientes; documentos propios. Los entrypoints antiguos conservan modos/confirmaciones/fixtures/comportamiento.
- Excluded: frontend/consent assets/registry flags, datos de clientes, DNS/SFTP, fuentes/targets reales, publicación/Ads/cuentas. Cambios del coordinador o nuevo control de mantenimiento necesitan ownership/ticket separado.
- Dependencies: PR235 offline aprobado; main236 incluido. Rama/worktree separado. Si la herramienta debe desplegar antes de235, PR de tooling retrocompatible independiente y sucesor staged revisado: no fusionar235 incompatible para poder obtener la herramienta.
- Verify: TDD con Git bytes históricos9760, cadena válida e inválida, rechazo antes de writes, planes obsoletos, árboles/ancestros, archivo/auditoría ocupados, deriva entre captura/claim/renames, replay, fallos/rollback, inventarios históricos intactos; Node20 y empaquetado real. Linux del código nuevo, BFCache nativo y plan de cutover siguen gates reales, no se sustituyen con el PREVIEW antiguo.
- Parallel-safe: documentación/inspección solamente hasta aprobación. No dos writers de lifecycle/empaquetado/coordinador. Integración de implementación y revisión separadas de APPLY.

## Autoridad de ejecución posterior

Actualización2026-10-21: Jairo autorizó explícitamente una ventana de mantenimiento de la generación, validaciones y corte seguro para publicar los ajustes de Claudia, sin DNS ni campañas. La autorización no convierte la herramienta offline en un adaptador productivo: se mantiene el rechazo WRITER_EXCLUSION_UNPROVEN hasta contar con exclusión/integración revisadas, Linux y plan/lineage reales. En el intento inicial no hubo acceso operativo funcional ni se detuvieron servicios. Gate BFCache nativo del release006 comprobado separadamente; no sustituye los restantes. El permiso está registrado; no volver a pedirlo como si faltara, ni atribuir al usuario los bloqueos técnicos pendientes.

La aprobación de este contrato permitirá código/pruebas offline, NO cambios persistentes. Antes del APPLY: lineage real validado, pruebaLinux nueva, ventana de exclusión acordada, hashes de plan/paquete frescos y autorización explícita de Jairo. Coordinar el par master/código sin deploy incompatible. Publicación del master y regeneración/publicación Claudia se autorizan y verifican aparte; campañas/activaciónGA4Meta no incluidas.

Assessment local completo (ignorado): `.local-secrets/sdd/CDX-20261021-006/current-master-assessment.md`.
