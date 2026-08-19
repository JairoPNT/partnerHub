# Reporte de Ejecución - AGR-20260819-004_remove_legacy_payment_ui

**ID del Request:** AGR-20260819-004
**Estado:** DONE

## Resumen de cambios realizados

Se retiró la opción de cotización `Legacy (Simple)` del formulario de registro manual de pagos en la interfaz (`payments-management-view.tsx`):

1. **Retiro del Selector `Legacy (Simple)`:**
   - El tipo de estado `pricingMode` se ajustó a `ManualPaymentPricingMode` (`"CATALOG" | "MANUAL_NEGOTIATED"`).
   - Se eliminó la tercera opción/botón `Legacy (Simple)` del modal de creación de pago.
   - El formulario permite seleccionar exclusivamente entre **Catálogo de Oferta** (`"CATALOG"`) y **Negociado Manual** (`"MANUAL_NEGOTIATED"`).

2. **Ajuste del Manejador de Envío (`handleRegisterPayment`):**
   - Se eliminó la rama `else` que permitía enviar registros sin asignación explícita de ecosistemas o modo de cotización.
   - Ahora todo nuevo pago registrado desde la UI incluye explícitamente `pricingMode` y `ecosystemTypes`.

3. **Compatibilidad Histórica Preservada:**
   - Se mantiene 100% intacta la capacidad del backend para procesar y listar registros históricos legacy.
   - Se conservan en la tabla del historial los indicadores y advertencias de pagos antiguos sin snapshot (`Requiere Asignación (Legacy)`).
   - No se realizaron cambios en pagos existentes, ledger, Wompi, APIs, base de datos ni catálogo de precios.

## Archivos modificados y creados
- `app/web/components/payments-management-view.tsx` (Modificado)
- `app/web/components/manualPaymentsView.test.ts` (Modificado)
- `brain/agent-requests/antigravity/reports/AGR-20260819-004_remove_legacy_payment_ui_DONE.md` (Nuevo)

## Verificación realizada
- `node --experimental-strip-types --test components/manualPaymentsView.test.ts` -> Pass (3/3 tests pasados)
- `node --experimental-strip-types --test components/mobileDrawer.test.ts` -> Pass (2/2 tests pasados)
- `npx eslint components/payments-management-view.tsx components/manualPaymentConstants.ts components/manualPaymentsView.test.ts` -> Pass (0 errores, 0 warnings)
- `npm run build` en `app/web` -> Pass (Build exitoso, TypeScript check aprobado)
- `git diff --check origin/main...HEAD` -> Pass (Limpio, sin errores de formato)

## Resultado del build
El build completó de forma totalmente exitosa en `app/web` con 0 errores de TypeScript y 0 errores de linting.

## Rama, commit y PR
- **Rama:** `antigravity/AGR-20260819-004-remove-legacy-payment-ui`
- Commit listo en la rama basada en `origin/main`.
- Push realizado a `origin/antigravity/AGR-20260819-004-remove-legacy-payment-ui`.
- PR no abierto a la espera de auditoría.
