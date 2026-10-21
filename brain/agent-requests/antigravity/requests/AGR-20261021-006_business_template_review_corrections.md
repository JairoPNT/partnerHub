# AGR-20261021-006 — Correcciones de revisión de la plantilla Business

Estado: pendiente. Follow-up de AGR-20261021-001 (commit bb2f3c7); no repetir su implementación ni declarar aprobación de publicación.

- Owner: Antigravity / frontend; Codex coordina/revisa, no edita plantilla.
- Outcome: corregir dos findings independientes de consentimiento en la plantilla aprobada para tráfico pagado.
- Dependencies: AGR-001 bb2f3c7 terminado; revisar diff y preservar todos sus controles. Ejecutar ANTES de AGR-003 FAQ y AGR-005 consentimiento, que comparten archivos. No ejecutar si otro owner edita estas rutas.
- Allowed: plantillas-de-pagina/business/app.js, index.html, styles.css, config.js y app/web/scripts/business-paid-traffic-template.test.mjs; request/reporte propios.
- Excluded: backend/APIs/auth/Prisma, runtime measurement y sus tests, Master Sites UI, otros ecosistemas, fuentes/master persistentes, cuentas/proveedores, publicación/DNS/SFTP.
- Parallel-safe with: CDX-005 backend y AGR-004 runtime por rutas separadas; NO con AGR-003/005 u otro writer de plantilla.

## Findings obligatorios

1. P2: app.js:397 escribe --hero-desktop-bg/--hero-mobile-bg, pero styles.css no consume esas variables. Conectar imágenes aprobadas del perfil a la representación responsive real, conservando legibilidad, fallback sin imagen y validación del host/path. Pruebas con URLs desktop/mobile distintas del default; comprobar estilos calculados/render móvil y escritorio, no solo data-attributes.
2. P2: app.js:16,292, config.js:159 e index.html:166 propagan la dedicación exacta de Claudia como fallback del hero para todos. El hero compartido debe ser neutral, sin afirmar dedicación particular. Conservar precedencia del perfil validado del partner. No inventar una aprobación para ese copy genérico; AGR-003 ya posee el ajuste posterior SOLO de la FAQ mínimo2/recomendación8–12/disclaimer.

## Verificación y entrega

- Tests RED/GREEN sobre código real, perfil con imágenes distintas, fallback neutral sin perfil, perfil Claudia conservado, aviso obligatorio y CTA intactos.
- Mantener identidad y contacto derivados, VSL visible, sin duraciones/claims no validados, ni loaders/emisores/estilos master nuevos.
- Regresiones de plantilla/WhatsApp/VSL, lint/build aplicable y evidencia visual local móvil/escritorio con red controlada. No publicar ni emitir eventos.
- Rama/worktree propio, commit/PR revisable sin merge; reporte brain/agent-requests/antigravity/reports/AGR-20261021-006_business_template_review_corrections_DONE.md. Revisión independiente antes de AGR-003/005.
- El test backend businessMasterContent.integration.test.mjs:45 conserva una aserción del antiguo headline; documentar handoff backend separado, no editarlo desde frontend.
