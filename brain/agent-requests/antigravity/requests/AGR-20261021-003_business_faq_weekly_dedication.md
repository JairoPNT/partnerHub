# AGR-20261021-003 — Dedicación semanal en FAQ de Negocio

Estado: cambio de copy solicitado por Jairo el 2026-10-21; pendiente de implementación por Antigravity. No publicado.

- Owner: Antigravity.
- Scope: cambiar únicamente la respuesta de «¿Cuánto tiempo debo dedicarle a la semana?» en la plantilla BUSINESS; conservar las demás preguntas y respuestas.
- Texto: «Puedes empezar dedicando un mínimo de 2 horas a la semana. Si tu disponibilidad lo permite, te recomendamos entre 8 y 12 horas semanales para la formación y las actividades comerciales. La dedicación depende de tus objetivos y no garantiza resultados.»
- Allowed: el campo de respuesta de esta FAQ en `plantillas-de-pagina/business/` y su test específico; respetar el contrato `businessLandingContent.dedicationText` cuando sea la fuente de esa respuesta.
- Excluded: otras FAQs, diseño, CTAs, video, medición, backend, APIs, fuentes guardadas de partners, publicación y proveedores. No convertir el rango recomendado en requisito fijo ni prometer velocidad o resultados.
- Dependencies: integrar después de `AGR-20261021-001`; esta instrucción sustituye su texto anterior de dedicación para esta FAQ. No duplicar ni ejecutar en paralelo sobre los mismos archivos. Si el perfil de Claudia conserva el texto previo, registrar el ajuste pendiente mediante su flujo autorizado, sin editar fuentes productivas desde esta tarea.
- Parallel-safe with: `AGR-20261021-002` (editor en módulos distintos); no altera esquema ni API.
- Verification: comprobar mínimo de 2 horas, recomendación opcional de 8–12, disclaimer y resto de FAQs intacto; verificar fallback y precedencia del perfil sin cambiar otros campos. El texto cabe en el límite de 300 caracteres existente.
- Delivery: rama/PR propios, diff acotado y reporte `brain/agent-requests/antigravity/reports/AGR-20261021-003_business_faq_weekly_dedication_DONE.md`, con pruebas/build aplicables. Publicar en Claudia exige el gate de integración separado.
