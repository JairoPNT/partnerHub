# CDX-20260818-008 — Contrato de oferta, ecosistemas y regeneración pendiente

## Owner

Codex (Backend Lead).

## Objetivo único

Definir e implementar el contrato backend que expone, para un partner, la oferta contratada, los ecosistemas incluidos, los targets esperados y si requiere regeneración/publicación después de un cambio comercial.

Este ticket es el primer paso de la cascada. No implementa UI, creación de subdominios ni publicación automática.

## Contexto

La vista Domains hoy muestra inventario técnico, pero no permite saber qué ecosistemas compró un partner ni qué páginas deben regenerarse. La fuente comercial debe ser el snapshot de oferta persistido en la activación/pago, no una inferencia por dominio o `siteId`.

## Alcance permitido

- Servicios backend de activation lead, catálogo/snapshot de oferta y publicación.
- Tipos/contratos de respuesta internos necesarios para exponer el estado comercial.
- Endpoint interno autenticado para consultar el resumen por `activationLeadId` o `siteId`.
- Pruebas unitarias backend.
- Request y reporte DONE.

## Fuera de alcance

- Componentes React, Tailwind, sidebar o tablas visuales.
- Creación/eliminación real de DNS o subdominios.
- Publicación SFTP/Hostinger.
- Cambios en Wompi, ledger o checkout.
- Migraciones destructivas o modificación manual de datos existentes.
- Regeneración automática de páginas.

## Dependencias

- CDX-20260812-010, CDX-20260812-012, CDX-20260812-013 y CDX-20260812-016, que establecen el catálogo y snapshot de oferta.
- Contrato de targets de `subdomainProvisioningService`.

## Contrato funcional requerido

La respuesta debe distinguir explícitamente:

- `activationLeadId`.
- `offerCode` y snapshot/precio contratado, si existe.
- `includedEcosystems`: `PRODUCT`, `BUSINESS`, `PERSONAL_BRAND`.
- `rootEcosystem`: ecosistema que ocupa el dominio raíz según la regla vigente.
- `expectedTargets`: dominio raíz y subdominios esperados, sin afirmar que ya existen.
- `existingTargets`: targets técnicamente registrados.
- `missingTargets`: targets esperados que aún no existen.
- `regenerationRequired`: booleano.
- `regenerationReasons`: razones determinísticas, por ejemplo oferta nueva, ecosistema activado o target ausente.

Reglas mínimas:

1. La oferta 360 incluye Producto, Negocio y Marca Personal.
2. Una oferta individual incluye únicamente su ecosistema.
3. La raíz es Marca Personal cuando está incluida; si no, se usa el único ecosistema contratado.
4. Con varios ecosistemas, Producto y Negocio usan sus subdominios.
5. No se debe inferir la oferta recortando nombres, dominios o `siteId`.
6. Un cambio de oferta no publica ni sobrescribe páginas: solo marca `regenerationRequired`.
7. Partners legacy sin snapshot deben responder `commercialState: UNKNOWN` y no recibir ecosistemas inventados.

## Aceptación

- Pruebas para Producto individual, Negocio individual, Marca Personal individual y 360.
- Prueba de partner legacy sin snapshot.
- Prueba de targets completos y targets faltantes.
- Prueba de que el cálculo no muta ni escribe datos.
- ESLint backend, build y `git diff --check` aprobados.
- Reporte DONE con archivos, endpoint, ejemplos de respuesta, riesgos y siguiente ticket frontend.

## Paralelización e integración

- No es paralelo-seguro con otro ticket que modifique catálogo de ofertas, snapshots, targets o el mismo endpoint.
- Sí puede ejecutarse junto a tareas de assets/templates que no toquen backend comercial ni publicación.
- Después de este ticket se crea un ticket Antigravity para la UI de asignación/estado y otro ticket de integración para regeneración explícita.
