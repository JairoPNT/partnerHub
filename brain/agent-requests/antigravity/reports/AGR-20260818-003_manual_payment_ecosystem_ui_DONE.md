# Reporte de Ejecución - AGR-20260818-003_manual_payment_ecosystem_ui

**ID del Request:** AGR-20260818-003
**Estado:** DONE

## Resumen de cambios realizados

Se actualizó la UI del módulo de Payments (`payments-management-view.tsx`) para soportar el registro manual de pagos con asignación comercial explícita de ecosistemas y modos de precios, en total compatibilidad con las especificaciones backend de `CDX-20260818-010` y `CDX-20260818-012`:

1. **Constantes y Tipos Comerciales (`manualPaymentConstants.ts`):**
   - Definición de ecosistemas: `PRODUCT`, `BUSINESS`, `PERSONAL_BRAND`.
   - Definición de ofertas de catálogo (`PLAN_360`, `PRODUCT_ONLY`, `BUSINESS_ONLY`, `PERSONAL_BRAND_ONLY`) asociadas a sus precios e infraestructuras de ecosistemas.
   - Definición de etiquetas y colores visuales para cada ecosistema.

2. **Selector de Modo de Cotización / Precio (`payments-management-view.tsx`):**
   - **Modo `CATALOG`:** Permite elegir una oferta del catálogo oficial (`PLAN_360`, `PRODUCT_ONLY`, etc.). El frontend envía `offerCode`, los `ecosystemTypes` correspondientes y `pricingMode: CATALOG` con el monto oficial devuelto por el servidor, sin inventar montos ni calcular reemplazos en el cliente.
   - **Modo `MANUAL_NEGOTIATED`:** Permite seleccionar uno o varios ecosistemas (Producto, Negocio VSL, Marca Personal) mediante checkboxes, ingresar el monto negociado directo y registrar notas de justificación.
   - **Modo `NONE` (Legacy):** Preserva la compatibilidad para registrar pagos simples legacy si fuera necesario.

3. **Gestión de Advertencias Legacy (`selectedLeadHasLegacyUnassigned`):**
   - En el modal de registro, si el partner seleccionado posee pagos manuales anteriores sin asignación explícita de ecosistemas (`method !== WOMPI && !commercialSnapshot`), se despliega una advertencia en color ámbar informando que el nuevo registro asignará sus ecosistemas en el servidor.

4. **Notificación de Estado `regenerationRequired`:**
   - Si la respuesta del backend tras el `POST /api/internal/payments` incluye `regenerationRequired: true`, la UI despliega un banner de notificación informativo avisando que la landing del partner requiere regeneración, sin ejecutarla de forma automática.

5. **Visualización de Ecosistemas y Estados en la Tabla Histórica:**
   - Incorporación de insignias distintivas para cada ecosistema asignado (`Producto`, `Negocio (VSL)`, `Marca Personal`).
   - Insignia del modo de precio (`Catálogo` vs `Negociado Manual`).
   - Insignia de advertencia para pagos legacy (`Requiere Asignación (Legacy)`).
   - Insignia de regeneración pendiente (`⚡ Regeneración Pendiente`).

## Archivos modificados y creados
- `app/web/components/manualPaymentConstants.ts` (Nuevo)
- `app/web/components/payments-management-view.tsx` (Modificado)
- `app/web/components/manualPaymentsView.test.ts` (Nuevo)
- `brain/agent-requests/antigravity/reports/AGR-20260818-003_manual_payment_ecosystem_ui_DONE.md` (Nuevo)

## Verificación realizada
- `node --experimental-strip-types --test components/manualPaymentsView.test.ts` -> Pass (2/2 tests pasados)
- `npx eslint components/payments-management-view.tsx components/manualPaymentConstants.ts components/manualPaymentsView.test.ts` -> Pass (0 errores, 0 warnings)
- `npm run build` en `app/web` -> Pass (Compilación limpia, TypeScript check aprobado)
- `git diff --check origin/main...HEAD` -> Pass (Limpio, sin errores de formato)

## Resultado del build
El build completó de forma totalmente exitosa en `app/web` con 0 errores de TypeScript y 0 errores de linting.

## Rama, commit y PR
- **Rama:** `antigravity/AGR-20260818-003-manual-payment-ecosystem-ui`
- Commit listo en la rama basada en `origin/main`.
- Push realizado a `origin/antigravity/AGR-20260818-003-manual-payment-ecosystem-ui`.
- PR no abierto a la espera de auditoría.
