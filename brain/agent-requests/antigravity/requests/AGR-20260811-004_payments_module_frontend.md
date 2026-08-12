# Request: Payments Module Frontend Admin Interface

**ID:** AGR-20260811-004
**Type:** Frontend Feature Implementation
**Target:** Payments Module Dashboard

## Context
El backend del ledger ya está implementado y desplegado en el PR #110. No se modificará el backend, APIs, persistencia ni contratos de base de datos. Se requiere construir la vista principal de la interfaz administrativa del módulo Payments, conectándolo con los endpoints reales.

## Endpoints
1. `GET /api/internal/payments`
   - Opcionales: `activationLeadId`, `siteId`, `from`, `to`, `status`.
   - Respuesta: `{ payments: [], totalAmountCop: number, totalsByLocalDate: {} }`
2. `POST /api/internal/payments`
   - Body: `{ activationLeadId, siteId?, category, amountCop, method, paidAt, reference?, notes?, idempotencyKey? }`
3. `GET /api/internal/payments/{id}`
4. `POST /api/internal/payments/{id}/void`
   - Body: `{ reason }`

## Alcance y Requisitos
1. **Vista Principal**: Construir `PaymentsManagementView` respetando el diseño actual de PartnerHub (similar a `PartnersReferralsView` o `ActivationLeadsView`).
2. **Tabla y Dashboard**: Mostrar total de pagos confirmados, cantidad de pagos, filtros (partner, fechas, estado) y una tabla con las columnas de categoría, monto COP, método, fecha, estado, referencia y acciones.
3. **Formulario de Registro Manual**: Un modal/formulario que solicite el partner, categoría, monto (entero positivo en COP), método, fecha/hora, referencia (opcional) y notas (opcional). Incluir alerta de confirmación antes de guardar.
4. **Anulación**: Modal de confirmación que requiera un motivo obligatorio antes de anular un pago confirmado.
5. **UI States**: Manejar carga, vacío, error, y éxito.
6. **Formato**: Renderizar montos como moneda local de Colombia (COP).
7. **Responsive**: Adaptable a escritorio y móvil (Tablas scrolleables, modales adaptables).
8. **Restricciones Duras**:
   - No datos falsos (dummy data) o simulados.
   - No inferir revenue desde precios de planes (usar monto ingresado).
   - Los pagos VOIDED no suman a los ingresos confirmados.
   - No permitir editar un pago, sólo anular y registrar uno nuevo.
   - Aislar esta interfaz; no inyectar todavía el enrutamiento visual/sidebar global ("No modificar Dashboard todavía").
   - No tocar backend, Prisma, infraestructura.

## Ejecución
1. Crear el nuevo componente en `app/web/components/payments-management-view.tsx`.
2. Validar con `npx eslint components/payments-management-view.tsx`.
3. Compilar con `npm run build`.
4. Verificar responsive.
5. Redactar el reporte `AGR-20260811-004_payments_module_frontend_DONE.md`.
6. Subir a una rama aislada, hacer push. No hacer merge.
