# AGR-20261022-001 — seguimiento de paleta de campaña Claudia

Estado: pendiente de frontend; no ejecutar publicación ni modificar backend desde este request.
Owner: Antigravity. Tier: balanced para implementación/revisión visual.

## Resultado único

Resolver el punto visual pendiente de los 12 ajustes aprobados: Claudia debe usar el enfoque juvenil azul, lima y blanco. La entrega pública del 22oct ya refleja copy, FAQ, CTA, VSL neutro y consentimiento; conserva el tema anterior oscuro/magenta. No repetir AGR-20261020-003 ni FAQ/consentimiento ya entregados.

## Límites

- Allowed: inspección de configuración/presets visuales existentes y archivos frontend de la plantilla Business estrictamente necesarios para propuesta y prueba visual local. Declarar archivos exactos/branch/worktree antes de implementar; si requiere cambiar un pin o perfil de master, devolver handoff al backend, no editarlo.
- Excluded: backend, fuentes productivas de partners, auth, API, Prisma/DB, master migrations, pins/hashes, Docker, DNS/SFTP, publicación, campañas, credenciales y medición. No alterar CTA IDs, copy, contrato de consentimiento ni flagsfalse.
- Dependencies: CDX-20261022-005 entrega pública completada; verificar conflictos con requests frontend activos antes de tocar archivos.
- Parallel-safe: revisión documental/analítica sin archivos de plantilla compartidos. No paralelizar con otro escritor de config/app/styles/index Business o runtime-assets.
- Integration: no desplegar template/código sin coordinar el gate existente de master; entregar opción exacta de preset/config y pruebas, no crear nuevo publicador ni cambiar plantilla común para todos los partners por una campaña individual.

## Evidencia y aceptación

Página observada: https://negocio.claudiacalero.pro/ . Informe CDX-20261022-005_claudia_publication_DELIVERY.md. Comparar móvil/escritorio, contraste y legibilidad, preservando identidad y datos exclusivos de Claudia. Distinguir resultado local de entrega pública; no afirmar campaña lista con GA4/Meta desactivados. Reporte obligatorio con mismo ID, archivos/commit/pruebas/build/pendientes y propuesta de integración.
