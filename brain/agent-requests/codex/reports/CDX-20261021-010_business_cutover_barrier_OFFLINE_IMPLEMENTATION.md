# CDX-20261021-010 — Implementación offline revisada

Fecha2026-10-22 America/Bogota. Owner Codex backend. Estado: IMPLEMENTADO/REVISADO OFFLINE; no DONE productivo. Rama `codex/CDX-20261021-010-business-cutover-barrier`, worktree `C:/Users/jairo/.codex/worktrees/business-consent-runtime/PartnerHub`. Base main237 `0e652ec8e25e4bce09f472c87c59a60c6dad7c34`; código final revisado `82f960a192dcadf1fdd01b61956aa4dcc9427cf2`.

## Alcance entregado

Cuatro subagentes implementadores secuenciales, cada uno con TDD y revisión independiente por tarea, más revisión conjunta y una sola ola de corrección/re-revisión. Ninguno tocó UI, plantillas, auth, Prisma, pagos, DNS, SFTP ni campañas. Ningún claim ni dato productivo fue creado/modificado.

| Tarea | Commit | Resultado |
|---|---|---|
|1 Store físico/credencial privada y handles opacos |06af680|Revisión spec/seguridad APPROVED|
|2 Handshake global antes/después y verify Business guardado |918d3b2|Revisión spec/seguridad APPROVED|
|3 Controlador durable, administración exclusiva y drenado real |8918335|PASS con dos minors llevados a final|
|4 STATUS read-only y bundles Node20 reales |d94ae0f|Revisión spec/calidad APPROVED|
|Corrección conjunta de cuatro hallazgos |82f960a|Re-revisión final APPROVED; todos ADDRESSED|

Archivos: nuevos businessCutoverClaimStore(.test).ts y businessCutoverMaintenanceService(.test).ts; coordinator/test/child existentes; guard de productPageVerificationService y test; verify route/test (solo error409); CLI business-cutover-maintenance.ts y packaging test; Dockerfile/package scripts. Cambios documentales propios. Sin deps nuevas/lockfile/config de compilación ni hooks productivos de prueba.

## Garantías y límites efectivos

- Mismo claim `.master-package-claims/ganomaster-business`; adquisiciones frescas de sitio comprueban cierre antes/después, reentrancia activa puede drenar, contextos vencidos no heredan autoridad. Cleanup solo de objetos físicamente propios; no TTL/PID/toma de claims huérfanos.
- Credencial aleatoria privada0700/0600, nunca stdout/HTTP ni aprobaciones JSON. Handles/control en WeakMaps privados. Administración `.controller` exclusiva; callback revoca trabajo nuevo y espera el tail antes de liberar solo su lock, jamás cierre global.
- Eventos canónicos exclusivos con hashchain/fsync, límite10000 comprobado antes de escribir; estado de migración irreversible. Drenado inspecciona claims reales, no cola vacía. Caída/ambigüedad conserva evidencia y bloqueo; recuperación extraordinaria no implementada.
- Pins durables del output y descendientes propios; recorrido de ancestros actuales sin seguir links y comprobación antes/después de cada validación. Registro2 rechaza1 sin upgrade. Fixture de reparent conserva inode/canonicalpath del volumen y comprueba resume en hijo nuevo; NO sustituye dos contenedores Linux reales.
- POST verify Business bloquea antes de source/fetch/persistencia, responde409 con error fijo. Product/Brand y auth no cambiados.
- CLI productivo permite únicamente `npm run maintenance:business-cutover-status`; modo exacto STATUS, sin BEGIN/CANCEL/RELEASE/root/token/hash/force. No usar las APIs internas de mantenimiento sobre producción mientras falte integración/verificador. CDX009 APPLY permanece WRITER_EXCLUSION_UNPROVEN.
- Frontera cooperante de volumen privado, no sandbox contra root/mismo UID hostil. Hashchain no es auditoría inmutable externa. No garantía de toda escritura de pagos/dominios/leads ni operadores/scripts ajenos.

## Verificación fresca del controller en código82f960a

Desde `app/web`, Node24.16.0 para pruebas TS; Node20.20.2 real para el runtime nuevo y build. No existe `npm test` genérico; se ejecutaron los conjuntos relevantes completos, no se afirma suite global inexistente.

1. **Regresión ampliada**: node con conditions=react-server, experimental-strip-types y loader scripts/node-test-alias-loader.mjs, --test sobre store/controller/coordinator/directverify/verifyroute/sourcecontent/mastercontent/mastercommand/worker/generationCTA/verificationcontract/Productcoordinator. Exit0, **141totales:140PASS,0FAIL,1skip** (`rejects symlink source paths instead of reading or replacing external files`, privilegios symlink Windows no disponibles). Duración69s. Log `regression-final.log`.
2. **Compatibilidad/migración/empaquetado**: `node --test scripts/business-cutover-runtime-packaging.test.mjs scripts/business-master-runtime-packaging.test.mjs scripts/business-consent-master-package-migration.test.mjs scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/jairo-business-master-package.test.mjs`. Exit0, **187PASS/0FAIL/0skip**,45s. Variable de test BUSINESS_CUTOVER_TEST_NODE20 apunta al binario20; el test exige major20, no fallback24. Los fixtures nuevos ejecutan bundles fuera del source tree con env mínimo sin credenciales; los child legacy usan host24 y no se presentan como Node20. Log `migration-packaging-final.log`.
3. **Global lint**: `npm run lint`, exit0, cero errores/warnings ESLint. El CLI en scripts excluidos tuvo lint explícito --no-ignore; MJS tiene sintaxis+ejecución, no se atribuye a ESLint global. Log `lint-final.log`.
4. **Build final prescrito**: cwd app/web, binario Node20 + `node_modules/next/dist/bin/next build`, exit0, TypeScript de Next terminado,39/39 rutas. Log `build-final-correct-cwd.log`. Advertencias Next: workspace root con varios lockfiles y NFT trace amplio; no se llama warning-free.
5. **Invocación alternativa fallida, conservada**: desde raíz, `next build app/web` con el mismo binario produjo Buffer/BodyInit en preview route:61 no modificado. Al volver al cwd prescrito app/web, el mismo código pasó sin parche. No se afirma resuelta ni diagnosticada completamente la causa de esa sensibilidad de invocación. Log `build-final.log`. Un build anterior a la ola final también pasó; no se utiliza como sustituto del final.
6. Diff-check branch/source y staged documental: sin errores. TypeScript focalizado de los agentes:0diagnósticos; el tsc global de fixtures conserva deuda previa TS5097/tipos de tests, documentada en task-2-report, no se declara saneada por el build Next.

Los tests emitieron warnings Node existentes (loader experimental/module typeless), no ocultados. TDD/RED/GREEN y reportes de tarea están preservados en el directorio ignorado `.local-secrets/sdd/CDX-20261021-010/`: task-1..4-report/review, final-review, final-fix-report y final-fix-review, paquetes diff y logs. Registro de ejecución en progress.md. No se borró scratch ni worktrees de terceros.

## Revisión final y decisiones registradas

Revisión inicial detectó P1 pin de ancestros externos al volumen, P2 busy500, P3 evento10001 y P3 prueba de cola al finalizar callback. Se corrigieron los cuatro en82f960a; revisión limitada al diff los declaró ADDRESSED sin nuevos Critical/Important. Los tests del fix fueron50/50, y la regresión fresca del controller amplió a141totales. Pruebas previas no se repitieron por cada reviewer; los dictámenes distinguen inspección de evidencia y ejecución.

Decisiones del controller: (1) limitar pins persistidos al volumen y revalidar ancestros actuales para cumplir continuidad entre contenedores; una interpretación incorrecta podría bloquear resume o perder un rebind, por eso se mantienen identidad exacta del output/objetos y ensayo Linux obligatorio; (2) ampliar estrechamente el fix al route409 para cumplir semántica busy, sin cambios auth; una respuesta incorrecta afectaría manejo/retry de callers. No se descartó ningún hallazgo de seguridad.

## Gates pendientes y siguiente paso

**Linux NOT_RUN**: Docker Desktop start devolvió Starting, pero docker version no encontró el motor Linux. No filesystem/UID/modes/fsync reales ni redeploy de dos contenedores con volumen común. No habilitar mutaciones ni merge productivo como si este gate estuviera cubierto. Preparar el ensayo en contexto limpio de archivos Git, sin incluir secretos/scratch local.

Después: integración dependiente de CDX009 bajo propiedad real del mismo cierre (el reader actual rechaza claim propio), adaptador de migración/verificador fijo de reapertura; release compuesto235+protocolo+integración, comprobar retiro de tareas viejas/volumen común y lineage/planes reales; ventana ya autorizada, luego generación/publicación de Claudia por flujo existente y verificación pública de FAQ/WhatsApp/video/consentimiento/eventos. No repetir etapas offline cerradas ni publicar235 aislado. No se verificó hoy el resultado live237 en EasyPanel.

No publicación, mantenimiento productivo, DNS/campañas ni apagado local nuevo. La página pública de Claudia no fue actualizada por este ticket. La entrega permanece en draft por estos gates, no por falta de otra autorización de la misma ventana.
