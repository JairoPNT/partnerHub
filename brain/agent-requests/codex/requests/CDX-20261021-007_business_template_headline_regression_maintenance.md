# CDX-20261021-007 — Aserción backend del headline Business aprobado

Estado: pendiente, no ejecutado. Follow-up de revisión AGR001/006; no change de producto ni publicación.

- Owner: Codex Backend Lead.
- Outcome: actualizar la aserción de integración que aún espera el headline de ingresos retirado, conservando verificación real del contenido del master aprobado.
- Allowed: app/web/server/services/businessMasterContent.integration.test.mjs y request/reporte propios; helper fixture existente solo si indispensable y sin alterar política productiva.
- Excluded: plantilla/frontend, source/generador/registry productivos, APIs/auth/Prisma, package/lock, datos reales, proveedores, DNS/SFTP/publicación.
- Dependencies: basarse en commits revisados de plantilla PR230 y backend PR231 ensamblados en entorno aislado; no ejecutar contra canonical viejo ni mientras otro writer tenga estos tests reservados.
- Parallel-safe: lectura de plantilla, sin cambiar sus assets; no compartir helper/tests con CDX005/integración activa.
- Evidence: AGR001/006 detectaron línea45 que espera Construye Libertad Financiera con un Hábito Diario; el headline aprobado es Desarrolla una Actividad de Venta Directa con Acompañamiento. No relajar la prueba a simple existencia ni esconder un fallo real de generación.
- Verify: RED de aserción antigua sobre template revisado; GREEN tras corrección exacta; probar preservación de master, identidad/CTA/perfil y política de medición usando preparador/autoridad reales con fixtures aprobadas, sin llenar registry productivo. Documentar Node warnings y alcance build real.
- Delivery: branch/worktree propios, revisión independiente; reporte brain/agent-requests/codex/reports/CDX-20261021-007_business_template_headline_regression_maintenance_DONE.md. No autoriza release ni producción.
