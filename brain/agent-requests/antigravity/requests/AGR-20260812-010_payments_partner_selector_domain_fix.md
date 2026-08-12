# Request: Payments Partner Selector Domain Fallback Fix

**ID:** AGR-20260812-010
**Type:** Bugfix / Enhancements
**Target:** Payments Module Frontend (`payments-management-view.tsx`)

## Context
Ajuste en la resolución del dominio del partner en el selector de partners del módulo de pagos para priorizar el campo real del backend `lead.onboardingData?.domain`.

## Alcance y Requisitos
1. Actualizar el mapeo de dominio en `payments-management-view.tsx` para incluir el orden de fallback:
   `lead.onboardingData?.domain || lead.onboardingData?.customDomain || lead.onboardingData?.domainName || null`
2. No modificar backend, APIs, Dashboard, Sidebar ni Topbar.
3. Ejecutar ESLint focalizado, `npm run build` y `git diff --check origin/main...HEAD`.
4. Generar el reporte DONE correspondiente.

## Ejecución
1. Actualizar `payments-management-view.tsx`.
2. Validar con `npx eslint components/payments-management-view.tsx`.
3. Ejecutar `npm run build`.
4. Verificar `git diff --check origin/main...HEAD`.
5. Redactar el reporte `AGR-20260812-010_payments_partner_selector_domain_fix_DONE.md`.
