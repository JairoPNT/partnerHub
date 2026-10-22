# Integración segura del corte Business existente

Ticket CDX-20261021-011. Owner Codex backend. Base main522394bf00ffbeb45e892b60403835f8c8296ec6 (PR238). Fecha2026-10-22.
**Estado: alcance aprobado; especificación propuesta para revisión. No es implementación ni autorización de ejecución del corte.**

## 1. Intención, decisión y límites

Publicar cuanto antes los ajustes aprobados de negocio.claudiacalero.pro sin generar sitios con un par código/master incompatible, conservar la página estática disponible y reutilizar el flujo actual de PartnerHub. No tocar DNS, campañas, Product/Brand, credenciales ni otros dominios. La ventana ya está autorizada. La garantía es cooperación de writers reconstruidos sobre volumen privado, no aislamiento de root/mismoUID hostil ni de scripts externos.

Se elige conectar los módulos existentes con autoridad interna real. Frente a ello, mantener las herramientas separadas no permite ejecutar la migración, y una subida manual añadiría una segunda ruta sin las mismas verificaciones. Se descartan flags de aprobación, JSON de prueba, claims borrados y la imagen histórica235 sola. El diseño no modifica el contenido aprobado de la plantilla.

Único resultado de011: conector de migración/captura/verificación/reapertura sobre el cierre010. Componer235 con main, desplegar/cortar sobre datos reales y publicar/validar Claudia siguen entregas dependientes con evidencia propia. La integración es inseparable entre sus módulos de autoridad; no es permiso para combinar frontend, campañas o nuevos servicios en este ticket.

## 2. Hechos y contratos que se conservan

-009 captura lineage9760 y archivo e9a2, seis bytes de plantilla revisados, inventarios, snapshots físicos, dos renames, archivo/auditoría y rollback condicionado. Su APPLY público siempre falla WRITER_EXCLUSION_UNPROVEN. Su READBACK ordinario exige el contrato histórico exacto: no acredita reapertura.
-010 tiene store con registro físico2, credencial privada, handles/control en WeakMaps, controlador exclusivo, eventos fsync y drenado del namespace real. No tiene RELEASE/CANCEL ni adaptador009; CLI enviada es solo STATUS. El reader009 rechaza el claim propio y el lifecycle actual adquiere/libera su claim legacy.
- Linux010 aceptado con revisión independiente: Dockerfile real desde Git limpio, Node20 packaging4/4, TS Linux44/44, contenedores distintos con volumen común y pruebas POSIX/crash. No prueba la integración011 todavía.
- PR23582b6c5d conserva el release de tráfico/FAQ/consentimiento por carga, seis pins revisados y providers false. Está separado y tiene conflictos con main. El manifest master canónico es negocio.ganomaster.pro; su valor no demuestra publicación pública del master.

Se conserva BUSY409 para Business, Product/Brand/auth sin cambios, no TTL/PID takeover, no `--force`, no exportación de secretos ni recuperación de exclusión huérfana. APIs públicas009 siguen cerradas; la integración solo se ejecuta por el runner administrativo fijo.

## 3. Piezas, autoridad y límites de módulos

1. **Conector interno011:** único orquestador entre perfil fijo, control010 y lifecycle009. Resuelve root/paths desde configuración existente validada; no recibe factories, callbacks aprobatorios, directorios arbitrarios o perfiles desde HTTP/env/CLI. Fixtures privados pueden usar temp roots, nunca ampliar la superficie productiva.
2. **Capacidad de migración efímera:** se obtiene solo desde un control genuino y activo, bajo su cola serial. Liga misma operación/output, recordDigest, captura vigente y plan exacto. Su validez se comprueba antes de cada paso de lifecycle. No se puede serializar, restaurar de JSON, conservar tras el callback ni transferir entre copias independientes del bundle.
3. **Lifecycle existente:** modo legacy intacto para callers previos. El modo interno solo acepta la capacidad genuina, no un booleano ni un objeto de callbacks del caller. Reutiliza staging/renames/archivo/journal/rollback; no adquiere un segundo claim y no libera el cierre global, ni en éxito, error o finally. Cleanup limitado a sus objetos temporales demostrados.
4. **Verificador fijo011:** lector de compatibilidad actual y autoridad de fin. No abre por `VERIFIED` guardado ni por un hash enviado. Consume hechos de disco y capacidades del mismo grafo; llama internamente al mecanismo de commit de liberación solo tras verificarlos otra vez.

La CLI administrativa, conector, store, controlador y verificador se empaquetan en **un grafo**. No pasar handles entre CLI STATUS, migrador standalone009 y otro bundle. Ningún endpoint web entrega estas capacidades. El store no importa perfiles de release; los writers no deben adquirir dependencia del runner administrativo.

## 4. Perfil fijo y preparación de artefactos

Dos perfiles cerrados: **PREDECESSOR** (runtime cooperante con master9760, apto solo para cancelar antes de migrar) y **SUCCESSOR** (release235 compuesto con010+011 y master de consentimiento). Cada uno tiene ID de release constante en código, inventario esperado, seis hashes revisados, manifest y flags GA4/Meta false. Ninguna opción permite aprobar otra combinación.

El build produce inventario de archivos ejecutables/recursos de todos los writers que realmente envía cada imagen (Next/servicios y bundles standalone, coordinador y guard directo incluidos). El verificador lleva compilado el digest del inventario de **su propia imagen**, generado después de construir writers y antes de empaquetar la CLI; compara bytes instalados y valida que corresponden al perfil fijo. No es un manifiesto editable junto al runtime ni un hash declarado en una variable. La CLI/verificador forman parte de la base de confianza revisada y quedan fuera de su propio inventario para evitar un hash autorreferente; su procedencia se verifica con el digest real de imagen/tareas y build revisado desde fuera del contenedor. ID de release o protocolo por sí solos no prueban procedencia ni cooperación.

Antes de BEGIN deben existir las dos imágenes revisadas, sus digests reales y prueba de acceso para reanudar. Tooling PREDECESSOR conserva código/master canónico antiguos e incorpora los seis archivos sucesores **sin modificarlos**, en staging fijo `/app/runtime-assets/business-consent-successor`, no en el directorio canónico. SUCCESSOR lleva la plantilla canónica nueva y el protocolo completo. La preparación/composición de estas imágenes es un gate posterior; no usar hashes provisionales ni marcarla lista desde este documento.

Tooling usa solo el staging fijo, validado contra los pins009; el antiguo `--template-dir` read-only no se convierte en permiso mutante. El plan liga el ID SUCCESSOR y los bytes aprobados; el verificador SUCCESSOR comprueba su inventario compilado y procedencia real antes de abrir. Es una cadena de confianza de build/despliegue revisado, no detección automática de toda tarea desde el interior de una réplica.

## 5. Captura actual y plan aplicable

Bajo control exclusivo, drenar claims reales y validar íntegramente el journal010. Capturar predecessor, lineage y bytes de journals históricos, identidades del output y objetos protegidos, staging fijo sucesor, ausencia de archivo/reserva/auditoría nuevos, jobs/claims, propietario real del cierre y recordDigest. El reader interno acepta únicamente **ese** claim comprobado; claims ajenos, corruptos o sustituidos y cualquier writer activo bloquean. Los lectores públicos no cambian su política.

El plan determinista fija esos hechos y el perfil de release. No incluye la identidad efímera del lock administrativo, el último contador de eventos ni metadatos esperadamente cambiantes del directorio de operación: se validan como autoridad actual aparte. Así otra adquisición legítima para APPLY puede reconstruir el mismo plan. Sí se conservan las pruebas físicas estrictas de master/staging/lineage dentro de la transacción y la detección mutate/revert. Cambios de artefacto/jobs protegidos invalidan el plan, no se fuerzan.

PREVIEW no migra ni publica, pero adquirir/soltar la exclusión administrativa puede escribir metadatos; la salida debe declarar esa diferencia honestamente, no `localWritesMade:false` global. El hash confirmado vincula la selección exacta, **no** concede propiedad. APPLY reconstruye y compara el plan bajo control activo y valida de nuevo antes de escribir.

Persistir internamente el plan validado y vincularlo al marcador MIGRATION_STARTED, con comprobaciones de propiedad/estado y formato estricto. Ese marcador debe ser durable antes de staging/reservas/primera mutación del paquete. No hay cancelación al perfil antiguo desde ese instante, aunque falle antes del primer rename. No reejecutar APPLY automáticamente tras caída: readback/inventario seguro decide el diagnóstico; estado parcial conserva cierre y requiere recuperación separada.

## 6. Migración, auditoría y continuidad entre imágenes

Reutilizar exactamente el lifecycle transaccional existente con la capacidad interna: no copiar el executor de tests como ruta productiva ni escribir otro migrador. Archivo/journals históricos anteriores quedan byte-identical. La auditoría nueva de009 permanece en su ruta fija; su `planMaterial.schemaVersion=2` incorpora operación/recordDigest/perfil/plan actuales y distingue el claim propio del snapshot legacy vacío. El reader interno011 reconoce esa versión exacta; el READBACK público009 legacy puede rechazarla y nunca sirve como reapertura. Si la ruta ya está ocupada, rechazar salvo diagnóstico/readback exacto de la misma operación; no sobrescribir ni reinterpretar formatos antiguos.

Dentro de una sola transacción se comprueban inodes, bytes y ancestros actuales antes/después. Tras el despliegue se usa otro verificador **fijo de compatibilidad**, no igualdad de la captura física completa de la imagen anterior: /app, overlay raíz y staging ya pueden ser distintos. Deben conservarse identidad del volumen/output, operación/credencial, archivo protegido/auditoría y lineage exactos. Se revalida la seguridad de todos los ancestros actuales; no se relaja globalmente el reader histórico009.

Tras migrar, terminar el comando libera solo `.controller`; el claim global sobrevive. SUCCESSOR arranca bajo ese mismo cierre y bloquea generación/verify antes de tocar fuente/proveedor. Reanuda desde los archivos privados de la operación, nunca importando un handle JSON ni conservando memoria del proceso anterior. Image/task retirement y operadores externos se prueban operativamente antes de habilitar el fin; cola vacía o réplica configurada1 no bastan.

## 7. Verificación, cancelación y reapertura

Con el mismo control serial activo y propiedad validada, ambos caminos comprueban namespace drenado, ausencia de jobs Business ejecutándose, journal íntegro, identidad del output, manifest/inventario/bytes exactos y runtime cooperante enviado según perfil fijo. Verificación es fresca y no reutilizable tras cambios.

- **CANCEL:** solo sin MIGRATION_STARTED, sin nueva mutación/auditoría011/009 y con PREDECESSOR íntegro, staging/reservas no interferidos y runtime PREDECESSOR correcto. Si hay duda, no cancela. No downgrade público.
- **REOPEN:** solo con MIGRATION_STARTED ligado al plan exacto, master SUCCESSOR completo, archivo/lineage y auditoría009schema2 consistentes, perfil SUCCESSOR correcto y todos los artefactos cooperantes presentes. Código antiguo aunque master sea correcto, o master antiguo aunque código sea correcto, bloquean.

Ningún comando acepta `verified:true`, `writerExclusionProven`, hash de runtime como aprobación, roots alternos, `--force` ni limpieza genérica. Unknown fields se rechazan. Comprobar de nuevo los hechos/ownership justo antes del commit bajo la misma exclusión; no soltar el lock entre verificar y liberar.

## 8. Punto de commit y fallos de reapertura

No prometer “todo error conserva el cierre” después de haberlo retirado. Antes del commit, cualquier error/caída conserva el claim global y su evidencia. Preparar y fsync una intención de fin inmutable, en ruta fija privada de la operación, ligada a recordDigest/plan/perfil/capturas/identidad del claim. Después de releerla y validar los hechos, **rename atómico en el mismo volumen** del claim global completo a `operation/released-claim` es el punto de commit. Destino debe estar ausente y pertenecer físicamente a la operación; no overwrite ni EXDEV. Esto conserva la evidencia, evita unlink de owner seguido de rmdir parcial y no elimina la operación/credencial.

El permiso interno terminal debe seguir comprobando propiedad del objeto reubicado y retener el control hasta cerrar su auditoría; no aplicar a ciegas el assert del path activo ya ausente ni dejar que finally borre evidencia. Fsync de padres y recibo terminal inmutable siguen al commit. La transición depende de hechos físicos, no de la última palabra guardada en eventos. No añadir limpieza automática de `released-claim`.

Una interrupción en torno al rename se diagnostica sin mutar: global propio presente = cerrado; global ausente más claim reubicado exacto/intención válida = commit observado; conflicto/sustitución = resultado desconocido. Si falla fsync/recibo **después** del rename, reportar `RELEASE_COMMIT_UNCONFIRMED`, no afirmar “sigue cerrado”, ni volver a insertar un claim porque ya podrían existir writers nuevos. La salida distingue cierre activo, commit observado y persistencia final confirmada. No se certifica resistencia a pérdida eléctrica/rollback de storage; recuperación de ambigüedad tiene ticket separado.

Repetir fin no dispara otra migración ni retira un claim nuevo. Si otra operación ocupa el namespace, detenerse. Un recibo previo permite diagnóstico idempotente de su resultado, no autoridad para abrir otra vez. STATUS operativo habitual no se transforma en un comando de limpieza/recovery.

## 9. Runner y datos expuestos

Mantener STATUS010 tal cual. Nueva CLI011 con allowlist fija: BEGIN, DRAIN, PREVIEW, APPLY, VERIFY, REOPEN, CANCEL; operación por UUID no secreto, root desde configuración validada. APPLY requiere modo/confirmación literal/hash del plan exactos; REOPEN/CANCEL confirmación literal y verificador interno, nunca una prueba del usuario. No HTTP nuevo, shell dinámico, módulos arbitrarios, `--template-dir` mutante o banderas de bypass.

JSON redactado: request/mode/estado/razones, hashes de artefactos/plan no secretos y flags honestos de escrituras metadata/paquete, proveedor/publicación false. No credencial, ownerToken, rutas privadas, datos de leads ni args sin filtrar. Código de salida distingue bloqueo previo al commit de resultado de liberación incierto; nunca presentar un error ambiguo como publicado. La planificación técnica fijará el mapa de códigos sin alterar semántica de writers/worker.

## 10. Verificación de aceptación

- Fixture genuino9760+e9a2+lineage: begin/drain/capture/confirm/marca/lifecycle, archivo/journal exactos y cierre retenido, proceso/imagen nueva, verificar y reabrir con perfiles correctos. Cero llamadas de proveedor/publicación durante migración.
- Control/permiso falso, JSON, copia de bundle, extranjero, expirado, detached y dos controladores no conceden autoridad. Cancel-vs-start y verify-vs-commit serializados, incluida terminación con trabajo pendiente.
- Claims/jobs activos o inseguros, links/hardlinks, chmod/UID, misma-byte sustitución, output movido/copied, record1, credencial inválida y lock huérfano: no migración/fin/takeover.
- Plan estable tras nuevo lock legítimo; stale plan, mutate/revert, bytes CRLF, lineage/audit cambiado, destino/reserva ocupados, y fallos en staging/renames/journal/rollback conservan evidencia. API009 pública continúa bloqueada.
- Perfil/runtime equivocado aunque master sea correcto, master incorrecto con runtime correcto, flags proveedores alterados, bundle faltante/extras y release235 sin guard: no reapertura. Cancel solo predecessor intacto antes de start.
- Fallos antes/durante/después del rename terminal, fsync y recibo: estado físico/salida correctos, no falsa afirmación de cierre, no overwrite ni borrado ajeno, repetición no abre una operación nueva.
- Interleaving explícito: un BEGIN nuevo ocupa el global después del rename viejo pero antes del fsync/recibo/cleanup antiguo; el controlador viejo finaliza solo su claim reubicado/auditoría y jamás afirma propiedad o elimina el claim nuevo.
- Build real Node20 standalone, ambos perfiles y todos los bundles cooperantes; prueba de arranque SUCCESSOR bajo cierre previo antes de cualquier fuente/fetch/write; Product/Brand sin cambios. Linux/POSIX, dos contenedores mismo volumen con raíces distintas y caída dura. Lint/build/diff y revisión independiente por tarea/final, sin sustituir pruebas nuevas por conteos010.

Los22 advisories npm observados en el build010 se mantienen como riesgo sin triage/exploitabilidad ni waiver; PASS funcional no da certificación de seguridad. La composición/release debe consignar qué advisories aplican a sus artefactos; no realizar upgrades ajenos a este conector bajo pretexto de cerrar esta especificación.

## 11. Orden posterior y entrega

Primero revisión de esta especificación; después plan aprobado con tareas pequeñas/subagentes y revisión entre cada una. Luego011 implementado/revisado; composición235+010+011 con perfiles/artefactos fijos y ensayo completo; finalmente prueba de tareas reales/volumen/lineage/plan fresco y corte autorizado. No BEGIN hasta tener canal de reanudación y ambos artefactos listos.

Tras reapertura confirmada: validar fuente/entitlement/destino de Claudia y contenido FAQ aprobado, generar/publicar por Master Sites/worker existente, comprobar SUCCEEDED y página móvil/escritorio (CTA, VSL, duración, FAQ, navegación, privacidad/consentimiento por carga). Clic WhatsApp no es conversación/registro/venta; recepción de eventos distinta de presencia de scripts. Publicación del master público sigue independiente de su manifest. DNS/campañas/proveedores de medición nuevos no se activan por011.

Esta especificación no afirma master migrado, mantenimiento activo, consentimiento público corregido ni campaña lista. El alcance aprobado permite escribirla; su aprobación escrita y el plan son gates pendientes.

## Revisión de la especificación

Revisión propia: sin placeholders, separación explícita entre plan estable y evidencia volátil, compatibilidad del modo legacy y base de confianza del verificador, sin hash autorreferente ni garantía falsa tras el commit de reapertura. Revisión independiente de integridad/concurrencia22oct: sin Critical/Important ni cambios documentales bloqueantes. Se hizo explícito el interleaving de nueva operación durante la finalización anterior para que el plan lo convierta en prueba. Dictamen documental, no aprobación del usuario ni pruebas de código. Reporte local `.local-secrets/sdd/CDX-20261021-011/spec-review.md`; resumen versionado en el reporte DESIGN del request.
