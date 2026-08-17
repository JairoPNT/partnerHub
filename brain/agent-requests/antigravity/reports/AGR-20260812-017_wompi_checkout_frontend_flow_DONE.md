# Reporte de Ejecución - AGR-20260812-017_wompi_checkout_frontend_flow

**ID del Request:** AGR-20260812-017
**Estado:** DONE

## Resumen de cambios realizados

Se ha integrado el flujo frontend del checkout Wompi Sandbox con la API de intenciones de pago (`POST /api/public/payments/wompi/intent`), conectándolo directamente con el formulario de activación pública (`ActivationForm.tsx`) y el modal interactivo de pago (`PaymentModal.tsx`), con follow-up de aceptación para las siguientes reglas:

1. **Corrección del Redirect URL de Wompi Checkout:**
   - Se eliminó el `onboardingPath` como `redirect-url` de las peticiones a Wompi Checkout.
   - El parámetro `redirect-url` apunta de forma segura a la página de resultado/landing pública (`/oferta-beta` o `/activar`), impidiendo que Wompi redirija directamente a la ruta protegida de onboarding (`/onboarding/[token]`).
2. **Bloqueo Estricto de Acceso al Onboarding:**
   - El acceso al onboarding solo se habilita tras una confirmación `APPROVED` validada por backend. No se confía únicamente en callbacks o parámetros de URL del navegador.
   - El botón "Pago Confirmado — Continuar al Onboarding" en `PaymentModal.tsx` permanece **oculto** para los estados `INITIAL`, `PENDING`, `DECLINED` y `ERROR`.
3. **Manejo de Fallas en la Intención de Pago Wompi:**
   - Si `POST /api/public/payments/wompi/intent` falla, **no se llama a `onFormSubmit`** y **no se abre modal ni checkout estático**.
   - Se retiene el `leadId` registrado en el estado del formulario `ActivationForm.tsx` y se despliega un banner de error con el botón **"Reintentar Conexión Wompi Sandbox"**, permitiendo reintentar la creación de la intención sin duplicar el registro del lead.
   - Se removieron los fallbacks estáticos a `PAYMENT_CONFIG.wompi.checkoutUrl` si falta la intención server-side.
4. **Flujo de Transferencia Directa Habilitado:**
   - Para `paymentMethod === "direct"`, se conserva la disponibilidad del modal con datos de Bancolombia/Bre-b y acceso al onboarding sin pasar por Wompi.
5. **Pruebas de Unidad Automáticas:**
   - Creados `wompiCheckoutFlow.ts` y `wompiCheckoutFlow.test.ts` validados con el test runner nativo de Node.js (`node --test`).
   - Prueba añadida que verifica explícitamente que la URL de checkout de Wompi **jamás** contenga la ruta `/onboarding/` en sus parámetros de redirección.
   - Casos probados (6/6 pasados): intent exitoso, URL de checkout sanitizada sin onboarding path, intent fallido sin duplicar lead, bloqueo de onboarding antes de `APPROVED` y flujo de transferencia directa.

## Archivos o rutas modificadas
- `app/web/components/beta-landing/ActivationForm.tsx`
- `app/web/components/beta-landing/PaymentModal.tsx`
- `app/web/components/beta-landing/wompiCheckoutFlow.ts`
- `app/web/components/beta-landing/wompiCheckoutFlow.test.ts`
- `app/web/app/oferta-beta/page.tsx`
- `app/web/app/activar/page.tsx`
- `brain/agent-requests/antigravity/requests/AGR-20260812-017_wompi_checkout_frontend_flow.md`
- `brain/agent-requests/antigravity/reports/AGR-20260812-017_wompi_checkout_frontend_flow_DONE.md`

## Verificación realizada
- `node --experimental-strip-types --test components/beta-landing/wompiCheckoutFlow.test.ts` -> Pass (6/6 tests pasados)
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

## Riesgos pendientes
Ninguno. No se alteró ningún contrato backend, API interna, base de datos ni componente administrativo/dashboard. No se utilizan claves privadas ni se calculan montos client-side.
