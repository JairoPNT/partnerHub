# CDX-20261021-004 — Consentimiento y medición Business

Estado: Jairo autorizó avanzar el 2026-10-21; exploración/diseño realizados. Contrato y plan técnico requieren aprobación antes de implementación. No cambios de producto ni publicación.

- Owner: Codex, coordinación de backend; Antigravity mantiene browser runtime y UX.
- Scope actual: contrato verificable para default-deny, medición mínima e integración entre generador y plantilla.
- Allowed actuales: spec `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md`, esta solicitud y handoff documental. Lectura de fuentes/auditoría y documentos oficiales; no implementación de runtime todavía.
- Excluded: frontend/código de producto, cuentas, campañas, tags/eventos reales, publicación, DNS/SFTP y credenciales.
- Dependencies: auditoría CDX-20261021-002 y main con PR #226. Implementación dependerá de aprobación spec/plan y tickets de runtime/UI separados.
- Parallel-safe: AGR-20261021-001/002/003 por ser esta fase documental y read-only sobre código. No modificar sus archivos de producto.
- Resultado: propuesta en el spec, con pruebas posteriores, límites de SDK/PII y aislamiento Product/Brand. Sin certificación legal ni afirmación de readiness pública.
- Siguiente: revisión del spec por Jairo; después plan backend y requests AGR-004/005. Mantener plantilla/FAQ aprobados avanzando por sus propios tickets.
