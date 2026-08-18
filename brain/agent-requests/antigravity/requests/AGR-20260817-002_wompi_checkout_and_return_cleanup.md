# AGR-20260817-002 — Limpieza del checkout y retorno Wompi

## Responsable
Antigravity (Lead Product Designer & Frontend)

## Dependencias
- AGR-20260817-017 / CDX-20260817-003 desplegado en `main`.
- Rama creada desde `origin/main` actualizado.

## Alcance Permitido
- `app/web/app/oferta-beta/page.tsx`
- `app/web/components/beta-landing/PaymentSection.tsx`
- `app/web/components/beta-landing/PaymentModal.tsx`
- `app/web/lib/config/payment-methods.ts`
- `app/web/components/beta-landing/wompiCheckoutFlow.ts`
- `app/web/components/beta-landing/wompiCheckoutFlow.test.ts`
- `brain/agent-requests/antigravity/reports/AGR-20260817-002_wompi_checkout_and_return_cleanup_DONE.md`

## Objetivos
1. **Página pública de oferta:** Eliminar completamente la sección duplicada "Métodos de Pago Habilitados" fuera del modal.
2. **Modal de transferencia:** Conservar únicamente Bancolombia y Bre-b Llave 1 (`94536693`). Eliminar Bre-b Llaves 2 y 3.
3. **Wompi:** Eliminar cualquier botón o enlace Wompi antiguo/hardcoded. Utilizar únicamente la intención Wompi dinámica generada por el backend.
4. **Retorno del checkout:** Asegurar navegación en el mismo contexto (`window.location.href`) para fallbacks y mantener la correlación intacta.
5. **Estado del pago:** Mostrar mensajes claros y accionables para Procesando, Pendiente, Aprobado, Rechazado, Error y Tiempo Agotado (EXPIRED).

## No Modificar
- Backend, webhooks, Prisma, migraciones o ledger.
- Regla de onboarding: `status === APPROVED` y `paymentRecorded === true`.
