# AGR-20261021-009 — Confirmar retirada durante cuarentena

Estado: implementado y verificado localmente; pendiente revisión scoped e integración CDX006. Owner: frontend/Antigravity delegado, tier balanced. Follow-up de AGR005 dentro de la validación autorizada AGR005/CDX006; no cambia el contrato aprobado.

- Outcome: una retirada válida con categorías denegadas, runtime activo, reloadRequired=true y persistence=none conserva el estado factual de recarga requerida; no se presenta como API no disponible.
- Evidencia: revisión final CDX006, P3 en app.js:990–999; después de reset BFCache/peer con SDK iniciado, withdraw sí retira/broadcast pero UI exige persistence=session.
- Allowed: plantillas-de-pagina/business/app.js, consent-ui.test.mjs y request/reporte propios. Solo guardia de confirmación y regresión estrecha. No diseño/copy/estilos nuevo.
- Excluded: runtime/index/styles/config, backend/registry/harness, fuentes/master/publicación/proveedores reales. No aceptar respuestas malformadas, runtime deshabilitado ni categorías positivas.
- Dependencies: integración revisada 3b05356; parallel-safe AGR010 (runtime/test distintos). Una rama y worktree propios; no escritor compartido.
- Verify: RED que reproduzca snapshot válido de cuarentena persistence=none, retirada preservada y aviso correcto; GREEN; existentes UI+runtime y sintaxis. No suite global redundante. Root rebindea hashes por CDX006 después de revisión, nunca el frontend.
- Delivery: commit y reporte AGR-20261021-009_business_consent_quarantine_withdrawal_ui_DONE.md con evidencia RED/GREEN y límites; sin push/PR/merge. Revisión final scoped antes de handoff.

- Implementación: `20f0bee1236c5a879917a8bc6d8deec887b6f238`; reporte propio en `../reports/AGR-20261021-009_business_consent_quarantine_withdrawal_ui_DONE.md`. UI+runtime 47/47, cero skips. No publicación ni rebind de registry.
