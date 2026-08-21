# CDX-20260820-003 — Reporte DONE

## Recomendación aprobada

Usar una sola nomenclatura canónica de producción:

| Ecosistema | Partner canónico | Master canónico objetivo | Alias master actual |
| --- | --- | --- | --- |
| PRODUCT | `producto.<partner>` | `producto.ganomaster.pro` | `product.ganomaster.pro` |
| BUSINESS | `negocio.<partner>` | `negocio.ganomaster.pro` | `business.ganomaster.pro` |
| PERSONAL_BRAND | `brand.<partner>` | `brand.ganomaster.pro` | no requiere alias |

`rootEcosystemType` queda como preferencia semántica de redirect. No convierte un PublishingTarget en apex: los tres assets usan subdominios aislados. El dominio raíz puede redirigir al target elegido, pero no sustituirlo.

## Cambios backend

- Se agregó `partnerHostnameContract.ts` como fuente única de labels partner, masters canónicos objetivo y aliases master de transición.
- Entitlement ahora produce `producto`, `negocio` y `brand`, igual que provisioning.
- Provisioning cubre PERSONAL_BRAND con `brand` y crea siempre el subdominio canónico; no usa `rootEcosystemType` para convertir el target en apex.
- Publication target resolver acepta un subdominio aunque su ecosistema sea el redirect preferido.
- Targets v1/v2 apex existentes se conservan sin reescritura. Un intento de reprovisionarlos con la identidad canónica se bloquea por conflicto antes de cualquier proveedor.
- Masters activos no se cambiaron en `ecosystemService` ni `domainInventoryBuilder`: continúan apuntando a `product.ganomaster.pro` y `business.ganomaster.pro` hasta un cutover explícito.

## Compatibilidad y plan de transición

1. Inventariar de forma read-only PublishingTargets y DNS existentes.
2. Clasificar targets partner:
   - canónicos `producto/negocio/brand`: sin cambio;
   - apex legacy (`publicHost === baseDomain`): mantener operativos, no reprovisionar automáticamente;
   - English partner (`product/business`): marcar para migración explícita, sin overwrite;
   - otros hosts: revisión manual.
3. Crear y validar `producto.ganomaster.pro` y `negocio.ganomaster.pro` en un ticket de infraestructura separado.
4. Mantener `product.ganomaster.pro` y `business.ganomaster.pro` como aliases HTTP/HTTPS durante la ventana de compatibilidad.
5. Solo después de DNS, SSL, contenido y verification verdes, cambiar `MASTER_SITE_DOMAINS` y el inventario master a los canónicos nuevos.
6. Mantener redirects de aliases antiguos y observar tráfico antes de cualquier retiro. El retiro requiere decisión y ticket aparte.
7. Migrar partners legacy uno por uno con backup, dry-run, conflicto explícito y verificación; nunca en esta rama.

## Targets afectados

- Masters actuales `product.ganomaster.pro` y `business.ganomaster.pro`: requieren alias y cutover futuro; no se modifican ahora.
- `brand.ganomaster.pro`: ya coincide con el contrato objetivo.
- PublishingTargets partner `producto.*` y `negocio.*`: quedan alineados.
- Nuevos PERSONAL_BRAND: pasan a `brand.*`.
- Targets partner apex existentes: quedan legacy protegidos y requieren migración explícita si se decide moverlos.
- Cualquier target partner `product.*` o `business.*`: queda no canónico y requiere inventario/migración explícita.

No se accedió al almacenamiento productivo, por lo que este reporte identifica clases afectadas, no IDs reales. El inventario exacto requiere un ticket read-only autorizado.

## Archivos

- `app/web/server/services/partnerHostnameContract.ts`
- `app/web/server/services/partnerHostnameContract.test.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- `app/web/server/services/subdomainProvisioningService.ts`
- `app/web/server/services/subdomainProvisioningService.test.ts`
- `app/web/server/services/publicationTargetResolver.ts`
- `app/web/server/services/publicationTargetResolver.test.ts`
- `app/web/package.json`

## Verificación

- `npm run test:partner-hostnames`: PASS, 31/31.
- ESLint backend focalizado: PASS, cero warnings.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Warning no bloqueante: trazado NFT/Turbopack preexistente.

## Límites

No se ejecutaron provisioning, DNS, Hostinger, publicación, regeneración, migración ni cambios productivos. No se modificaron UI, Payments, Wompi, ledger ni Docker.

## Git

- Rama: `codex/CDX-20260820-003-partner-hostname-canonical-alignment`.
- PR: no abierto.
- Deploy: no ejecutado.
