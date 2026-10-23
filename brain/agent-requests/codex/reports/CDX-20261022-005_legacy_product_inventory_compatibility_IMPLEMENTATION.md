# CDX-20261022-005 — compatibilidad Product histórica

Estado: implementado, verificado localmente y aprobado por revisión de tarea y revisión final independiente; integración/operación pendientes. No publicación implícita.

## Implementación

Fuente congelada `f3daf37950967701c96a95a6d17cf716165a6017`, base main244 `7b6567aba8e1445e67b989014384cff60714d40b`. Único cambio productivo:17líneas en sourceIdentitySchema de masterSitesBusinessPreviewService.ts. Permite omisión real de ecosystemType solo en identidades históricas Product, devuelve objeto nuevo y conserva rechazo de tipos explícitos inválidos/undefined/null/empty, slugs/hosts Business yBrand sin tipo, inventario corrupto, ownership/dominio/raíces/jobs/entitlement/medición. No filtra registros ni reescribe fuentes.

Pruebas nuevas ejercen snapshots/input reales, correlación de póster, objetos congelados y bytes de archivos. Fixture de masterSitesBusinessRoutes.test.ts alineado con helper de medición aprobado y snapshot real aislado ya usados por comandos; mismo500!=202 reproducido en BASE antes de corregir fixture, aserciones y ruta productiva intactas. No UI/assets/pins/dependencias/Docker/auth/DB/protocolos/publicador nuevos.

## Verificación y límites

- Baseline40/40; RED67total64pass3fallos esperados; GREEN67/67, sin skips focales. Logs reales conservados.
- Run relacionado inicial233total231pass1fail1skip. Fallo de ruta reproducido sobre validatorBASE:4total3pass1mismofallo. Tras alinear fixture:233total232PASS0fail1Windows-symlinkskip. No afirmar suite global única: no existe npm test agregado.
- Node20.20.2 real: buildNext16.4.1/tiposproducción39/39 exit0, lint0. Build35warnings heredados de trazado/workspace; harnessNode24 conserva ExperimentalWarning y MODULE_TYPELESS_PACKAGE_JSON. Skip de privilegio symlinkWindows no es prueba nativa de enlaces.
- Primer build rechazó junction de node_modules fuera de raízTurbopack. Locks SHAiguales; junction propia movida recuperablemente a tooling ignorado propio, dependencia copiada físicamente sin editar donor/locks. Buildfinal correcto. No Dockerlocal ni instalación/cambio de dependencias para este correctivo.
- Controller leyó logs RED/GREEN/relatedfinal/buildfinal/lintfinal; diff protegido de plantillas/runtime-assets/Dockerfile/dependencias contra main244=0.

## Decisiones de ejecución

1. Alinear solo fixture de ruta por fallo preexistente medido; coste si equivocado: corrección/revisión de prueba, sin comportamiento productivo cambiado.
2. Congelar fuente tras pruebas relacionadas+lint para revisión RO paralela al build; aceptación/merge exige build0. Coste si build hallara fallo: invalidar candidato/revisar nuevoSHA. Buildfinal pasó en el mismo árbol.

Método subagentes, revisión por tarea y final independientes. Recursos completos en `.superpowers/sdd/2026-10-22-legacy-product-inventory/`; mantenerlos para reanudación. Importado además el informe operacional003/docs82a5b34 como643d8a9, sin delta productivo, para conciliar corte que ya terminó; no repetir001/003/004/010/011 ni APPLY.

## Operación aún pendiente

Revisión final completa BASE7b6567a..HEAD22fd083: Ready to merge YES, sin Critical/Important ni Minor accionable. Aceptó las dos decisiones acotadas anteriores. Los puntos no juzgados se disponen así: despliegue/QA pública siguen como siguiente gate obligatorio; recepción GA4/Meta no se afirma con flagsfalse; no recertificar/repetir cortes cerrados sin delta; skip nativo queda limitación y artefacto real se comprobará en VPS; frontend/DNS/otros partners/auth/DB/dependencias siguen excluidos. Informe privado conservado en final-review-report.md. Este checkpoint modifica solo documentación; fuente congelada f3daf permanece idéntica.

Antes del correctivo, producción main244 OPEN y Claudia sin cambios: fuente8ab7…/Producto276b…; cola solo históricosOct20 yactive0. Baseline protegido32fuentes ajenas SHA f1641c7c7451ff962beead6ffa2dcfebe02a6c7dfaff90479136c531aee7bf3f;92archivos de otros paquetes SHA9d080782c02cb8b79c29444d536dfd5ca0ba103bd16cc561bbf52105d0fc98b3. Comparar después de deploy/publicación. Valores de credenciales/contactos no registrados.

Tras aprobación de review y main/deploy: verificar runtime/OPEN; entitlement/identidad/source/jobs frescos, generación existente en puerto real80 soloClaudia con copy exacto master aprobado, workerSUCCEEDED, QA pública escritorio/móvil. No editar/publicar otros sitios/DNS/campañas ni activar GA4/Meta; mantener flagsfalse del piloto. No aceptar HTTP201/cola como éxito público.
