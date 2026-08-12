# CDX-20260812-010 — Catálogo de ofertas y snapshot de activación

## Request ID

`CDX-20260812-010`

## Owner

Codex (backend lead).

## Objetivo único

Implementar el catálogo server-side de ofertas de activación y guardar en cada nuevo registro de empresario un snapshot inmutable de la oferta seleccionada. El precio debe resolverse en backend a partir de un código permitido; nunca debe confiarse en un monto enviado por el navegador.

Este request no integra todavía Wompi, no crea webhooks y no modifica la interfaz visual.

## Catálogo aprobado por producto

Todos los valores son pagos únicos en COP:

| Código | Ecosistemas | Valor |
| --- | --- | ---: |
| `PRODUCT_ONLY` | `PRODUCT` | 180000 |
| `BUSINESS_ONLY` | `BUSINESS` | 180000 |
| `PERSONAL_BRAND_ONLY` | `PERSONAL_BRAND` | 100000 |
| `PLAN_360` | `PRODUCT`, `BUSINESS`, `PERSONAL_BRAND` | 350000 |

No agregar mensualidades, descuentos, impuestos ni prorrateos en este ticket. Si la gestión mensual se cobra aparte, se modelará en un ticket posterior.

## Alcance permitido

- Crear un módulo backend de catálogo tipado y validado con Zod.
- Exponer una función server-side para resolver una oferta por `offerCode` y devolver una copia segura del catálogo.
- Extender el contrato de creación de activation lead para aceptar `offerCode` opcional y persistir un snapshot normalizado con `offerCode`, `ecosystemTypes`, `amountCop`, `currency: "COP"`, `billingType: "ONE_TIME"` y `selectedAt`.
- Mantener compatibilidad con registros históricos sin `offerCode` ni snapshot.
- Rechazar códigos desconocidos y cualquier monto/ecosistema contradictorio enviado por el cliente.
- Añadir pruebas unitarias del catálogo, resolución, serialización y compatibilidad histórica.
- Documentar el contrato de salida que consumirá el siguiente ticket de Payment Intent/Wompi.

## Archivos/módulos permitidos

- `app/web/server/services/activationLeadService.ts`
- `app/web/server/services/` para el nuevo catálogo y sus pruebas
- `app/web/app/api/public/activation-leads/route.ts` únicamente si se requiere adaptar la validación del payload
- Tipos backend directamente relacionados con activation leads
- Este request y su reporte DONE

## Exclusiones estrictas

- No modificar componentes React, Tailwind, `oferta-beta`, `PaymentModal` ni el router visual.
- No modificar `manualPaymentLedgerCore` ni endpoints del ledger.
- No crear integración Wompi, checkout, webhook, firma de integridad ni llamadas a la API de Wompi.
- No modificar onboarding ni bloquear/desbloquear partners.
- No migrar ni reescribir registros existentes.
- No tocar dashboard, sidebar, planes, métricas ni archivos generados de sitios.

## Dependencias

- Ninguna para el contrato backend.
- El ticket posterior de Payment Intent/Wompi dependerá de este contrato.

## Paralelo seguro

Puede ejecutarse en paralelo con tareas de frontend de oferta, dashboard, Master Sites, héroes y plantillas, siempre que no modifiquen `activationLeadService.ts` ni el nuevo catálogo.

## Criterios de aceptación

1. `PRODUCT_ONLY` resuelve exactamente 180000 COP y solo `PRODUCT`.
2. `BUSINESS_ONLY` resuelve exactamente 180000 COP y solo `BUSINESS`.
3. `PERSONAL_BRAND_ONLY` resuelve exactamente 100000 COP y solo `PERSONAL_BRAND`.
4. `PLAN_360` resuelve exactamente 350000 COP y los tres ecosistemas.
5. El monto enviado por el cliente no puede alterar el precio del catálogo.
6. Cada alta nueva con oferta guarda el snapshot y la fecha de selección.
7. Altas históricas sin oferta continúan leyendo correctamente.
8. Las pruebas focalizadas, ESLint y `npm run build` pasan.
9. El reporte DONE indica archivos, contrato producido, riesgos y si requiere el ticket Wompi posterior.

## Siguiente ticket dependiente

`CDX-20260812-011` — Payment Intent + Checkout/Webhook Wompi en Sandbox, usando exclusivamente el snapshot producido por este request.
