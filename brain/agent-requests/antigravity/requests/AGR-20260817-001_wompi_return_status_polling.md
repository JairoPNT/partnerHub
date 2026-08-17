# Request: AGR-20260817-001_wompi_return_status_polling

## Contexto
El backend desplegó la API de consulta de estado de intenciones de pago Wompi en `GET /api/public/payments/wompi/status`.

## Objetivo
Implementar la captura de retorno desde el checkout Wompi Sandbox, el polling de verificación en tiempo real del estado de pago, la sincronización UI y la protección del acceso al onboarding.

## Requisitos
1. Leer los parámetros `id` y `env` de la URL de retorno (además de `reference` o `activationLeadId`).
2. No mostrar la oferta normal como un nuevo registro cuando existan parámetros de retorno o intención activa.
3. Consultar el endpoint `GET /api/public/payments/wompi/status` con polling controlado (cada 3s hasta 20 intentos o estado final).
4. Mostrar estados PENDING, APPROVED, DECLINED, VOIDED, ERROR y EXPIRED.
5. Solo habilitar onboarding cuando `status === APPROVED` y `paymentRecorded === true`.
6. Mantener la ventana/popup sincronizada mediante actualización de estado en tiempo real.
7. No confiar únicamente en el callback del navegador.
8. No crear nuevos leads durante el retorno.
9. No modificar el backend ni el ledger.
10. Crear pruebas automáticas, reporte DONE, commit y push sin abrir PR todavía.
