# Business Consent Release Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar los bytes aprobados PR235 con010/011 y preparar el corte existente para Claudia, sin nuevo publicador ni cambio de contenido.

**Architecture:** Dos imágenes con el mismo protocolo aprobado. PREDECESSOR conserva main/master9760 y transporta los seis bytes sucesores en staging fijo; SUCCESSOR incorpora235 y conserva010/011/241. El inventario existente determina el perfil; no añadimos aprobaciones, flags ni bypass. La publicación real depende de hechos operacionales, no de este checklist.

**Tech Stack:** Node20/Linux, TypeScript/Next, esbuild y Dockerfile existente. PowerShell host y sh Linux, nunca Bash.

**Spec:** `docs/superpowers/specs/2026-10-22-business-cutover-integration-design.md`, secciones4/10/11. Método/subagentes y ventana previamente aprobados; Jairo autoriza expresamente integrar235 y validar/publicar el2026-10-22. Este checklist concreta esas dependencias sin alterar contratos.

**Slicing:** Task1 corresponde al ticket002/una rama/un PR PREDECESSOR. Task2 corresponde al ticket003 dependiente/otra rama/un PR de integración SUCCESSOR desde main vigente. Task3 conserva evidencia de ambos artefactos y Task4 es gate operacional/publicación, no resultados implícitos de002. Esta secuencia evita desplegar una rama feature o reutilizar una rama cerrada. No se pide nueva aprobación del método/ventana ya aprobados; sí se detiene ante falta de hechos o autoridad nueva.

## Global Constraints

- PREDECESSOR conserva master9760 y lineage e9a2; SUCCESSOR conserva seis pins009, manifest negocio.ganomaster.pro, consentimiento por carga y GA4/Meta false. No hashes provisionales o perfiles suministrados por caller.
- No nuevo publicador, SFTP manual ni cambios DNS/campañas, UI/assets/copy revisados235, Product/Brand, auth/Prisma/pagos/credenciales.
- BEGIN productivo exige ambos artefactos revisados, canal probado de resume/reopen, procedencia/tareas/volumen/exclusión externa comprobados. Una consola dentro de una tarea no prueba todo el host.
- Desplegar solo commits de main revisados. Conservar evidencia anterior, no limpiar claims ni reejecutar APPLY tras caída.

## Review Focus

1. Copias staging deben ser bytes crudos Git exactos, no salida PowerShell/CRLF.
2. El predecessor no contiene código235 activo ni altera master/canonical; staging es input fijo y validado.
3. Conflicto de refresh conserva executor compartido y cinco archivos legacy frente a seis sucesores.
4. Fixture de packaging representa ambos perfiles; no rebaja inventario para hacer pasar una prueba.
5. Build/perfil local no acredita tareas remotas/volumen/canal ni entrega pública.

### Task1: Preparación fija PREDECESSOR

Files: Dockerfile; seis copias exactas bajo runtime-assets/business-consent-successor/; app/web/scripts/business-consent-cutover-runtime-packaging.test.mjs. No otros módulos runtime. BASE715994816f4864e19f0f95382dbb5bb152c88ea3.

Consumes: pins fijos existentes en build-business-cutover-writer-inventory.mjs y blobs de PR23582b6c5d. Produces: commit con canonical viejo intacto, staging fijo en/app/runtime-assets/business-consent-successor e inventario no-null predecessor.

- [ ] Test-first: comprobar seis staging hashes contra pins existentes y DockerCOPY en layout final antes del inventario; observar RED por wiring/input ausente. No reinventar pins.
- [ ] Copiar seis blobs aprobados sin transformar bytes; DockerCOPY fijo a builder y runtime antes chmod/inventario. No nuevo target/helper/flag.
- [ ] Adaptar prueba del layout copiado a staging real, eliminándolo solo en fixture para comprobar rechazo por falta; ningún nuevo permiso de runtime. Cubrir los tests packaging/inventario afectados, diff/lint y comparación binaria contra Git.
- [ ] Commit del owner; revisión independiente spec/calidad. No merge/deploy hasta gate de revisión/build.

### Task2: Composición SUCCESSOR de235

Files: merge235; resolver solo dos conflictos de código y dosbrain identificados, fixtures/tests afectados. Preservar bytes de assets y todo010/011/241. Detalle exacto en assessment read-only del ticket. Un solo implementador, después revisión de task1.

- [ ] Merge local235 sin publicar; conservar main lifecycle extraído, agregar arrays legacy y previousFiles para refresh de cinco a seis archivos; wrapper de carga local conserva comparación de hashes previa a staging de235. No modificar executor compartido/autoridad.
- [ ] Packagingtest conserva tests009 y añade fixture235 con helperlifecycle y subprocessNode20 explícito. Fixture runtime distingue canonical predecessor/successor sin sexto archivo sobrante en fixture viejo.
- [ ] Tests focales de refresh/lineage/package/pins, generación/consentimiento y wrappers Business; lint/build y rawsix exactos. No repetir010/011 completos ni atribuir resultados antiguos como frescos.
- [ ] Commit/revisión del delta de integración; preservar historia/aprobación más nueva de brain. PR235 continúa bloqueado para deploy hasta que el master/cierre sean compatibles.

### Task3: Artefactos y ensayo de ambos perfiles

- [ ] Contextos Git exactos auditados, Dockerfile real sin overlays falseados; ambas imágenes/releaseIds/digests y todos los writers inventariados.
- [ ] Ensayo privado Linux de flujo real con mismas imágenes: predecessor9760/e9a2, begin/drain/preview/apply conservando cierre; successor arranca bloqueado, verify/reopen; cancelar solo antes de START. Cero proveedor/publicación, preservar journals.
- [ ] Revisión final del delta/composición y evidencia. Resolver cada CannotVerify; advisories/tipos previos explícitos, no falsa certificación.

### Task4: Gate operacional y publicación existente

- [ ] Acreditar desde VPS tareas/images/retirement, volumen físico/UID/permisos privados y exclusión externa, más canal de reanudación probado. Sin hechos no BEGIN.
- [ ] Deploy predecessor revisado desde main, freshplan y corte existente; APPLY una vez, sucesor revisado desde main, VERIFY/REOPEN solo hechos frescos. No tocar DNS/campañas ni downgrade/replay/cleanup.
- [ ] Fuente/entitlement/target Claudia frescos; generación/publicación por worker existente. SUCCEEDED/COMPLETE y validación pública móvil/escritorio de CTA/FAQ/VSL/nav/identidad/privacidad/consentimiento por carga. Providers false se conservan; clic no se declara venta/conversación.
- [ ] Reportar hechos y gates incompletos, actualizarbrain y JSON oficial validado. Ningún resultado público implícito por merge/build.

## Preflight self-review

Task1→2 comparten Docker/fixture pero son secuenciales;2→3 consume commits congelados;3→4 consume digests pero exige prueba remota distinta. Todos los tests nuevos están asignados al código/fixture cambiado. No interfaces nuevas ni cambios de pins. Assessmentlocal exacto identifica cuatro conflictos, sin rediseño. El canal remoto sigue pendiente; no bloquea preparación local pero sí toda mutación del corte.
