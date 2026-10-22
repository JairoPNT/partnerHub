# CDX-20261021-010 — Exclusión Business durante el corte master/código

Owner: Codex backend. Revisión independiente: seguridad/concurrencia (premium por riesgo de integridad productiva).
Estado: especificación escrita aprobada por Jairo el 2026-10-22; plan técnico preparado para su revisión. No implementación ni uso productivo todavía.

## Resultado único

Extender el coordinador Business existente con un cierre durable y verificable que impida nuevas escrituras cooperantes durante todo el cambio de master y código. No crear otro publicador. La operación de publicación de Claudia conserva sus gates y autorización ya concedida; no está completada por este ticket.

- Allowed: coordinador Business y pruebas, servicio de verificación para cerrar su bypass directo y pruebas, módulo backend/CLI de mantenimiento y empaquetado estrictamente necesarios, documentación propia.
- Excluded: UI/plantillas/consent runtime, Prisma/auth/pagos, DNS, campañas, SFTP, fuentes/targets/paquetes reales, limpieza de claims históricos, modificación del lifecycle CDX009 o activación de su APPLY.
- Dependencies: PR237/CDX009 integrado; release235 revisado pero no integrado. Auditoría local de writers en `.local-secrets/sdd/CDX-20261021-009/writer-handshake-assessment.md` es evidencia de exploración, no gate productivo.
- Parallel-safe: revisión de diseño solo lectura; trabajo frontend independiente sin tocar contratos/generador/coordinación ni outputs compartidos. Implementación de este protocolo y su integración CDX009 no son paralelas.
- Integration: CDX009 sigue rechazando APPLY. Conectar su adaptador productivo a este protocolo será una tarea dependiente separada, después de probar y revisar la barrera. Ningún nuevo permiso declarativo acredita exclusión.

Especificación: `docs/superpowers/specs/2026-10-21-business-cutover-barrier-design.md`.
Plan técnico: `docs/superpowers/plans/2026-10-22-business-cutover-barrier.md`. Método de ejecución preservado: subagentes por tarea con revisión entre cada una; no iniciar hasta revisión del plan.

La ventana de mantenimiento y la dirección del cierre ya están autorizadas. No pedirlas otra vez. Por ser un protocolo durable entre procesos/despliegues, se aplica la ruta arquitectónica: revisar especificación escrita y luego plan técnico antes de implementación.
