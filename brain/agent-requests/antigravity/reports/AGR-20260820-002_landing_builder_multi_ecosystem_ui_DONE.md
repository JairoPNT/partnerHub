# Reporte de Ejecución - AGR-20260820-002_landing_builder_multi_ecosystem_ui

**ID del Request:** AGR-20260820-002
**Estado:** DONE

## Resumen de cambios realizados

Se extendió el Landing Builder (`product-page-generator-view.tsx`) para soportar la generación y publicación multi-ecosistema (Producto, Negocio VSL y Marca Personal) basada en el entitlement comercial real del partner:

1. **Selector de Ecosistema Comercial:**
   - Incorpora el módulo helper `landingBuilderEcosystemHelpers.ts` para evaluar la asignación de ecosistemas mediante `GET /api/internal/partner-ecosystem-entitlement`.
   - Reemplaza la vista exclusiva de Producto por un selector con 3 opciones:
     - **Producto (`PRODUCT`):** Plantilla Maestra `product.partner.pro` -> Host `product.<domain>`
     - **Negocio VSL (`BUSINESS`):** Plantilla Maestra `negocio.partner.pro` -> Host `negocio.<domain>`
     - **Marca Personal (`PERSONAL_BRAND`):** Plantilla Maestra `brand.partner.pro` -> Host `brand.<domain>`
   - Para socios como Claudia con plan o cortesías completas, los 3 ecosistemas se muestran disponibles y seleccionables.
   - Para socios con solo Producto (o plan parcial), los ecosistemas no incluidos se deshabilitan visualmente con una insignia `No en plan` impidiendo su selección o generación accidental.

2. **Payload y Contrato con Backend:**
   - Incluye `ecosystemType` exacto en la solicitud POST enviada a `/api/internal/product-pages/generate`.
   - Maneja explícitamente errores de entitlement HTTP 409 (`ECOSYSTEM_NOT_ENTITLED` / `PARTNER_ENTITLEMENT_NOT_FOUND`) retornando mensajes claros.
   - Garantiza que nunca se utilice el dominio raíz como destino para la generación de subdominios.

3. **Visibilidad de Estados Operativos:**
   - Despliega el estado comercial de oferta y muestra el indicador `Regeneración Requerida` (`regenerationRequired`) cuando existen desalineaciones entre los targets esperados y publicados.
   - Mantiene los estados de verificación, publicación y el panel de historial por sitio.

4. **Preservación Invariante:**
   - No modifica backend, schemas, Prisma, Payments, Wompi, ledger, DNS, Hostinger, Docker ni datos productivos.

## Archivos modificados y creados
- `app/web/components/landingBuilderEcosystemHelpers.ts` (Nuevo)
- `app/web/components/landingBuilderEcosystemHelpers.test.ts` (Nuevo)
- `app/web/components/product-page-generator-view.tsx` (Modificado)
- `brain/agent-requests/antigravity/reports/AGR-20260820-002_landing_builder_multi_ecosystem_ui_DONE.md` (Nuevo)

## Verificación realizada
- `node --experimental-strip-types --test components/landingBuilderEcosystemHelpers.test.ts components/complimentaryGrantHelpers.test.ts` -> Pass (11/11 tests pasados)
- `npx eslint components/product-page-generator-view.tsx components/landingBuilderEcosystemHelpers.ts components/landingBuilderEcosystemHelpers.test.ts` -> Pass (0 errores, 0 warnings)
- `npm run build` en `app/web` -> Pass (Build exitoso, TypeScript check aprobado)
- `git diff --check origin/main...HEAD` -> Pass (Limpio)

## Rama, commit y PR
- **Rama:** `antigravity/AGR-20260820-002-landing-builder-multi-ecosystem-ui`
- Commit listo en la rama basada en `origin/main`.
- Push realizado a `origin/antigravity/AGR-20260820-002-landing-builder-multi-ecosystem-ui`.
- PR no abierto ni deploy realizado a la espera de auditoría.
