# Reporte de Ejecución - AGR-20260817-001_wompi_return_status_polling

**ID del Request:** AGR-20260817-001
**Estado:** DONE

## Resumen de cambios realizados

Se implementó el follow-up de aceptación para correlacionar estrictamente la URL de retorno del checkout Wompi Sandbox con la intención de pago real de PartnerHub:

1. **Inclusión de Parámetros de Correlación en `redirect-url` (`wompiCheckoutFlow.ts`):**
   - Al construir la URL del checkout Wompi (`buildWompiCheckoutUrl`), el parámetro `redirect-url` incluye explícitamente `activationLeadId`, `reference` e `intentId`.
   - Se garantiza que el parámetro `redirect-url` apunte únicamente a la página pública `/oferta-beta` y **jamás contenga rutas de onboarding ni tokens de acceso**.

2. **Lectura y Validación Estricta de Correlación (`wompiCheckoutFlow.ts`):**
   - `parseWompiReturnParams` requiere obligatoriamente `activationLeadId` Y (`reference` O `intentId`).
   - Retornos que contengan únicamente `id` y `env` sin parámetros de correlación devuelven `null`. **No se convierte el `id` de Wompi en referencia `PH-` ni se fabrican intenciones artificiales con montos fijos.**

3. **Consulta de Estado Real y Polling Controlado (`PaymentModal.tsx`, `oferta-beta/page.tsx`, `activar/page.tsx`):**
   - En el retorno correlated, se invoca `GET /api/public/payments/wompi/status?activationLeadId=...&reference=...`.
   - La interfaz muestra el monto real retornado por la API server-side en lugar de valores estáticos.
   - El popup/modal original realiza polling dinámico cada 3 segundos hasta alcanzar un estado final.

4. **Protección Estricta del Acceso al Onboarding:**
   - La función `isOnboardingAllowed` exige `status === "APPROVED"` Y `paymentRecorded === true`.

5. **Pruebas de Unidad Automáticas (`wompiCheckoutFlow.test.ts`):**
   - 9 casos de prueba pasados (100% éxito):
     - `redirect-url` codifica `activationLeadId`, `reference` e `intentId`.
     - `redirect-url` no contiene `onboarding`.
     - `parseWompiReturnParams` no convierte el transaction id `id` en referencia `PH-`.
     - Retorno sin correlación no crea intent artificial ni usa montos fijos.
     - `isOnboardingAllowed` exige `status === APPROVED` y `paymentRecorded === true`.

## Archivos o rutas modificadas
- `app/web/components/beta-landing/wompiCheckoutFlow.ts`
- `app/web/components/beta-landing/wompiCheckoutFlow.test.ts`
- `app/web/components/beta-landing/PaymentModal.tsx`
- `app/web/app/oferta-beta/page.tsx`
- `app/web/app/activar/page.tsx`
- `brain/agent-requests/antigravity/reports/AGR-20260817-001_wompi_return_status_polling_DONE.md`

## Verificación realizada
- `node --experimental-strip-types --test components/beta-landing/wompiCheckoutFlow.test.ts` -> Pass (9/9 tests pasados)
- `npx eslint components/beta-landing/ActivationForm.tsx components/beta-landing/PaymentModal.tsx components/beta-landing/wompiCheckoutFlow.ts components/beta-landing/wompiCheckoutFlow.test.ts app/oferta-beta/page.tsx app/activar/page.tsx` -> Pass (0 errores, 0 warnings)
- `npm run build` en `app/web` -> Pass (Compiled successfully, static pages generated).
- `git diff --check origin/main...HEAD` -> Pass (Limpio, sin errores de whitespace).

## Resultado del build
El build fue completamente exitoso y completó TypeScript type checking sin ningún problema en `app/web`.

## Rama, commit y PR
- **Rama:** `antigravity/AGR-20260812-017-wompi-checkout-frontend`
- Commit de follow-up realizado.
- Push realizado a `origin/antigravity/AGR-20260812-017-wompi-checkout-frontend`.
- PR no abierto según las instrucciones del usuario.
