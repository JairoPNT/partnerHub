# AGR-20261021-005 — Aviso y preferencias de consentimiento Business

Estado: contrato y plan técnico PR #229 aprobados por Jairo el 2026-10-21. EJECUCIÓN EN HOLD: no iniciar implementación UI, ni siquiera con fixtures, hasta que Jairo resuelva la enmienda de privacidad pendiente y se completen/revisen las dependencias indicadas. La aprobación previa del contrato/plan no aprueba esa enmienda.

- Owner: Antigravity. Outcome: elegir/rechazar categorías y reabrir/retirar sin bloquear contacto o contenido.
- Plan: `docs/superpowers/plans/2026-10-21-business-consent-ui.md`; contrato común: `2026-10-21-business-consent-delivery.md` en la misma carpeta; spec de consentimiento aprobado.
- Allowed: `plantillas-de-pagina/business/index.html`, `app.js`, `styles.css`, nuevo `consent-ui.test.mjs`; request/reporte propios.
- Excluded: measurement-runtime.js y su harness/tests, config.js/FAQ/copy de campaña fuera de privacidad, backend/API/auth, fuentes de partner, proveedores, publicación y otros ecosistemas.
- Dependencies: AGR-001 y AGR-003 terminados/revisados antes de tocar sus archivos. Además, mantener toda implementación UI en HOLD hasta que Jairo decida la enmienda de privacidad pendiente; no avanzar con fixtures de API ni de otro tipo mientras esté pendiente. La API AGR-004 congelada no levanta este hold.
- Parallel-safe with: CDX-005, AGR-004 y AGR-002; NO con AGR-001/003 ni otro owner de app/index/styles.
- Gate de revisión actualizado: AGR-001 bb2f3c7 requiere follow-up AGR-006 antes de AGR-003 y este request. Esperar sus correcciones/revisiones; no mezclar fixes de contenido en consentimiento.
- Contract: solo getState/setConsent/withdraw y evento local; no localStorage/SDK/emisor propios. Aceptar/rechazar/configurar con peso equivalente; toggles inicialmente off. Cerrar/cancelar no acepta. No sugerir que aceptar es condición para WhatsApp o video.
- Required: reabrir/retirar; API ausente/tardía falla denegado; foco/teclado/aria/contraste/móvil; copy de privacidad factual, sin datos legales inventados. Mantener VSL visible, FAQ y CTA aprobados, IDs existentes y orden config/runtime/app.
- Verify: Node/DOM fixture y regresiones de plantilla; capturas locales. Browser/network conjunto en CDX-006. Ninguna señal real ni edición de cuentas.
- Delivery: rama/worktree propios, reporte `brain/agent-requests/antigravity/reports/AGR-20261021-005_business_consent_ui_DONE.md`, commits/pruebas/build aplicable/PR. No merge de UI activa antes de release compatible ni publicación.
