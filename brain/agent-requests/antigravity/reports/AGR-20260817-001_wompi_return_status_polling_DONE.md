# Reporte de Ejecución - AGR-20260817-001_wompi_return_status_polling

**ID del Request:** AGR-20260817-001
**Estado:** DONE

## Resumen de cambios realizados

Se implementó el modo de retorno de solo estado (*return status-only mode*) sin creación de objetos de intención artificiales ni montos fijos:

1. **Definición de Contexto Separado de Retorno (`wompiCheckoutFlow.ts`):**
   - Creada la interfaz `WompiReturnContext` conteniendo estrictamente `{ activationLeadId, reference, intentId, transactionId, environment }`.
   - `parseWompiReturnParams` devuelve `WompiReturnContext | null` y **jamás genera objetos `WompiIntent` artificiales, firmas vacías ni montos fijos (`0` ó `15000000`)**.

2. **Modo Estado Único en Modal de Pago (`PaymentModal.tsx`):**
   - `PaymentModal` acepta la nueva propiedad `returnContext?: WompiReturnContext`.
   - En modo retorno (`returnContext` presente sin `wompiIntent` activo):
     - **Oculto** el botón "Pagar con Wompi Sandbox".
     - **Oculto** el botón "Copiar link de pago".
     - **Oculto** cualquier monto inventado o en `0` (muestra "Verificando..." o el monto real retornado por la API server-side).
     - Desplegado **únicamente** el indicador de estado verificado por servidor y el botón "Verificar Estado".

3. **Polling Controlado por Servidor:**
   - La consulta `GET /api/public/payments/wompi/status` se realiza dinámicamente con `activationLeadId` + `reference` (o `intentId`).

4. **Protección Estricta del Acceso al Onboarding:**
   - Habilitado **únicamente** cuando `status === "APPROVED"` Y `paymentRecorded === true`.

5. **Pruebas de Unidad Automáticas (`wompiCheckoutFlow.test.ts`):**
   - 8 casos de prueba automáticos pasados (100% éxito):
     - `parseWompiReturnParams` devuelve `WompiReturnContext` limpio sin campos de `WompiIntent` artificial.
     - Retorno sin correlación devuelve `null`.
     - `redirect-url` incluye correlación y jamás contiene rutas de onboarding.
     - `isOnboardingAllowed` exige `status === APPROVED` y `paymentRecorded === true`.

## Archivos o rutas modificadas
- `app/web/components/beta-landing/wompiCheckoutFlow.ts`
- `app/web/components/beta-landing/wompiCheckoutFlow.test.ts`
- `app/web/components/beta-landing/PaymentModal.tsx`
- `app/web/app/oferta-beta/page.tsx`
- `app/web/app/activar/page.tsx`
- `brain/agent-requests/antigravity/reports/AGR-20260817-001_wompi_return_status_polling_DONE.md`

## Verificación realizada
- `node --experimental-strip-types --test components/beta-landing/wompiCheckoutFlow.test.ts` -> Pass (8/8 tests pasados)
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
