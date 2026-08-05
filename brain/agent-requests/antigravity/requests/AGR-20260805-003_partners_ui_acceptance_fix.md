# AGR-20260805-003: Corrección visual y aceptación de Partners

## Estado

PENDING

## Propietario

Antigravity

## Contexto

El request AGR-20260805-001 fue reportado como completado, pero la revisión visual en producción demuestra que varios cambios no llegaron o no cumplen el comportamiento solicitado. Este request es un follow-up de aceptación y no debe considerarse resuelto únicamente porque el build compile.

## Alcance

Solo frontend, UX y estilos. No modificar backend, Prisma, autenticación, Docker ni contratos API.

## Correcciones requeridas

### 1. Plantilla maestra y replicación

- Aplicar el sistema visual claro vigente al módulo “Plantilla Maestra y Replicación”.
- Eliminar de las superficies principales del módulo los fondos azul oscuro heredados y las clases de modo oscuro que produzcan paneles `bg-slate-900`, `bg-slate-950` o equivalente.
- Mantener contraste accesible, estados de éxito/error y jerarquía visual coherente con el resto del dashboard claro.
- Evitar redundancia: `ganomaster.pro` debe aparecer únicamente como origen/master, nunca como destino seleccionable de replicación.
- La tabla debe ser usable sin una barra de desplazamiento horizontal en el viewport normal. Reorganizar columnas, compactar información o usar acciones iconográficas con tooltip.

### 2. Operación de empresarios

- En la lista principal, reemplazar “Verificar ahora” por un botón únicamente iconográfico de verificación/actualización.
- Añadir `aria-label="Verificar sitio"` y tooltip visible al pasar el cursor.
- Mantener el botón de detalle/gestión como acción iconográfica de edición/gestión, también con `aria-label` y tooltip.
- No mostrar en la tabla principal contacto, método de pago ni referido; esos datos deben continuar disponibles en el detalle.
- Mantener el código de colores de estado, pero usando una insignia compacta y accesible.
- Comprobar que la reducción de columnas elimina el overflow horizontal en escritorio y sigue siendo legible en móvil.

### 3. Programa de Referidos

- El título visible debe ser “Programa de Referidos”, sin la palabra “Manual”.
- Mantener las funciones actuales, pero compactar los bloques “Asignar código a empresario” y “Registrar nuevo referido” para que no dominen la pantalla.
- Conservar los campos y contratos existentes; esta tarea es de presentación y usabilidad.
- Los formularios deben usar el mismo lenguaje visual claro del resto del dashboard, sin paneles azul oscuro heredados.

## Criterios de aceptación obligatorios

1. Captura o comprobación visual del módulo “Plantilla Maestra y Replicación” en tema claro.
2. Captura o comprobación visual de “Programa de Referidos” sin “Manual”.
3. Captura o comprobación visual de la operación de empresarios con botón de verificación solo con icono.
4. Verificación en viewport de escritorio sin barra horizontal para la lista principal de Partners.
5. Verificación responsive en viewport móvil sin texto cortado ni acciones inaccesibles.
6. Confirmar que `ganomaster.pro` no está entre los destinos de replicación.
7. Ejecutar `npm run build` en `app/web`.
8. Crear el reporte obligatorio en `brain/agent-requests/antigravity/reports/AGR-20260805-003_partners_ui_acceptance_fix_DONE.md` con archivos modificados, pruebas, resultado del build, rama, commit, PR y riesgos.

## Rama requerida

Crear una rama nueva y congruente:

`antigravity/AGR-20260805-003-partners-ui-acceptance-fix`

No reutilizar la rama de AGR-001 ni la de AGR-002.

## Entrega

No marcar este request como completado sin un commit y un PR hacia `main`. El reporte debe indicar explícitamente si los criterios de aceptación fueron comprobados en producción o solo localmente.
