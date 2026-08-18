# AGR-20260817-003 — Limpieza de información técnica visible en PaymentModal

## Responsable
Antigravity (Lead Product Designer & Frontend)

## Dependencias
- AGR-20260817-017 / AGR-20260817-002 fusionados en `main`.
- Rama creada desde `origin/main` actualizado.

## Alcance Permitido
- `app/web/components/beta-landing/PaymentModal.tsx`
- `brain/agent-requests/antigravity/requests/AGR-20260817-003_payment_modal_ui_cleanup.md`
- `brain/agent-requests/antigravity/reports/AGR-20260817-003_payment_modal_ui_cleanup_DONE.md`

## Objetivos
1. **Ocultar información técnica visible:** `Referencia PH-...`, `activationLeadId`, `intentId`, `transactionId`, `Wompi Sandbox`, `TEST MODE`, `paymentRecorded`.
2. **Mantener valores activos internamente:** Mantener intacto el uso de todos esos identificadores en polling, correlación de retorno y llamados a API server-side.
3. **Mensaje amigable de procesamiento:** Reemplazar el mensaje azul por “Estamos procesando tu pago. No cierres esta ventana.”.
4. **Estados visibles amigables:** Mensajes claros para Procesando, Pago aprobado, Pago rechazado, Pago expirado y No pudimos verificar el pago.
5. **Visibilidad condicional de "Verificar Estado":** Mostrar únicamente cuando exista demora, error o necesidad de reintento.
6. **No alterar:** Monto total, pestaña/método de pago, botón de pago, protección del onboarding ni regla `APPROVED + paymentRecorded === true`.
