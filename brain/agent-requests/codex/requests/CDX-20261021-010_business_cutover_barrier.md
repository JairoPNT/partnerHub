# CDX-20261021-010 — Exclusión Business durante el corte master/código

Owner: Codex backend. Revisión independiente: seguridad/concurrencia (premium por riesgo de integridad productiva).
Estado: especificación y plan aprobados por Jairo el 2026-10-22. Cuatro tareas implementadas y revisadas offline; corrección final82f960a aprobada por re-revisión independiente. Gate Linux aislado PASS y revisión independiente aceptada el22oct; integración009/reapertura y uso productivo pendientes. No declarar DONE productivo.

## Resultado único

Extender el coordinador Business existente con un cierre durable y verificable que impida nuevas escrituras cooperantes durante todo el cambio de master y código. No crear otro publicador. La operación de publicación de Claudia conserva sus gates y autorización ya concedida; no está completada por este ticket.

- Allowed: coordinador Business y pruebas, servicio de verificación para cerrar su bypass directo y pruebas, módulo backend/CLI de mantenimiento y empaquetado estrictamente necesarios, documentación propia.
- Excluded: UI/plantillas/consent runtime, Prisma/auth/pagos, DNS, campañas, SFTP, fuentes/targets/paquetes reales, limpieza de claims históricos, modificación del lifecycle CDX009 o activación de su APPLY.
- Dependencies: PR237/CDX009 integrado; release235 revisado pero no integrado. Auditoría local de writers en `.local-secrets/sdd/CDX-20261021-009/writer-handshake-assessment.md` es evidencia de exploración, no gate productivo.
- Parallel-safe: revisión de diseño solo lectura; trabajo frontend independiente sin tocar contratos/generador/coordinación ni outputs compartidos. Implementación de este protocolo y su integración CDX009 no son paralelas.
- Integration: CDX009 sigue rechazando APPLY. Conectar su adaptador productivo a este protocolo será una tarea dependiente separada, después de probar y revisar la barrera. Ningún nuevo permiso declarativo acredita exclusión.

Especificación: `docs/superpowers/specs/2026-10-21-business-cutover-barrier-design.md`.
Plan técnico: `docs/superpowers/plans/2026-10-22-business-cutover-barrier.md`. Método de ejecución preservado: subagentes por tarea con revisión entre cada una; no iniciar hasta revisión del plan.

Informe de implementación: `brain/agent-requests/codex/reports/CDX-20261021-010_business_cutover_barrier_OFFLINE_IMPLEMENTATION.md`. La revisión final añadió únicamente el mapeo409 del error ocupado en verify y su test, sin cambiar auth. Se precisó el límite durable: pins del output y descendientes; los ancestros externos del contenedor se comprueban en cada validación, no se fijan entre despliegues. Formato de registro2; el1 se rechaza sin upgrade. No hubo claims productivos creados por este trabajo.

Actualización Linux/live: `brain/agent-requests/codex/reports/CDX-20261021-010_business_cutover_barrier_LINUX_VALIDATION.md`. Build productivo Git limpio, Node20 packaging4/4, TS Linux44/44 y dos contenedores distintos/volumen común PASS, revisión independiente sin Critical/Important. PR237 deploy confirmado;235 tiene conflictos, no publicarlo aislado. La ausencia de integración ejecutable y verificador de reapertura permanece explícita.

La ventana de mantenimiento y la dirección del cierre ya están autorizadas. No pedirlas otra vez. Por ser un protocolo durable entre procesos/despliegues, se aplica la ruta arquitectónica: revisar especificación escrita y luego plan técnico antes de implementación.
