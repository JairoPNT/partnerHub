# CDX-20261021-003 — Seguimiento read-only de campañas activas

Estado: descubrimiento documental completado, 2026-10-21. Owner: Codex Backend Lead.

## Resultado y límites

La pantalla actual configura medición; no es todavía un dashboard de campañas ni de conversiones de Google Ads. Se propone abajo un contrato futuro de lectura, no una capacidad implementada. Ninguna cuenta, campaña, presupuesto, puja, conversión externa, credencial o página fue consultada o modificada.

Base inspeccionada: `d74b2fb9872adf1a53dc2c2f2402d3cd1f92538b`. Rama: `codex/CDX-20261021-003-analytics-monitoring`. Commit: el que incorpora este reporte y su request; consultar `git log` por el ID. Sin PR, push, merge, build de producto ni despliegue en este ticket.

Autoridad: especificación aprobada `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`, sección Analítica y Métricas (leída en el worktree `business-paid-traffic-followups`); PH-024 y PH-044 como antecedentes. La aclaración aprobada del 2026-10-21 limita esta entrega a monitoreo de campañas ya activas; no autoriza configuración/operación de Ads.

## 1. Pantalla y escrituras existentes

Rutas y líneas relativas al repositorio, verificadas contra la base anterior:

| Evidencia | Comportamiento comprobado |
| --- | --- |
| `app/web/components/analytics-and-metrics-view.tsx:75-101`, `:121-148`, `:272-317` | GET `/api/internal/activation-leads`, botón Actualizar, búsqueda y selección por nombre/marca/siteId/dominio. No carga una fuente publicitaria. |
| Mismo archivo `:150-207`, `:458-566` | Guarda `analyticsMeasurementId`, `metaPixelId`, `operatorNotes` mediante PATCH `/api/internal/activation-leads/{id}`. Formatos locales GA4 y Meta; aviso de regenerar/publicar. Son escrituras de configuración, no controles de campañas; no se cambian aquí. |
| Mismo archivo `:209-250`, `:568-583`, `:586-713` | `analyticsVerified: true` es una marca manual. El checklist enlaza a GA4 y usa presencia del ID/publicación. También trata `publicationState === VERIFIED` como Analytics verificado: no constituye evidencia de recepción de eventos ni de Ads. No hay timestamp dedicado de verificación mostrado. |
| Mismo archivo `:716-750` | “Google Ads Conversions / Próximamente”, input deshabilitado. El texto de compras v2 es intención de producto, no prueba de integración. |

El PATCH tiene efectos adicionales: `app/web/app/api/internal/activation-leads/[id]/route.ts:38-63` actualiza el lead, intenta sincronizar su source y llama `publicationEventEnqueueService.afterActivationChange`. No usar esta ruta de escritura para refrescar métricas. No se ejecutó para este informe.

## 2. Fuentes disponibles y ausencias

| Fuente | Qué representa; qué NO demuestra |
| --- | --- |
| `app/web/server/services/activationLeadService.ts:86-126`, `:179-200`, `:315-340`, `:401-445` | Leads persistidos en `.activation/leads.json`, identidad comercial, sitio vinculado y JSON de onboarding; merge de configuración y `onboardingUpdatedAt`. `PAID`/`CONVERTED` son estados internos, no conversiones de productos ni de anuncios. `recordState ACTIVE` tampoco es campaña activa. |
| `app/web/server/services/productPageLeadSyncService.ts:167-217` | Copia IDs GA4/Meta/Google Ads a source. `googleAdsConversionId` se conserva como `integrations.googleAds.conversionId`; solo almacenar un string no aporta cuenta, acción de conversión completa, recepción, atribución ni datos. |
| `app/web/server/services/masterSitesBusinessInput.ts:31-44`, `:90-96`; `productPageGenerationService.ts:148-177` | Ensamblador y esquema aceptan configuración de medición. No equivalen a cliente de reporting de Google Ads. |
| `app/web/server/services/trafficCampaignService.ts:9-40` | Máquina interna `REQUESTED -> READY -> ENABLED`, con PAUSED/COMPLETED/CANCELLED y transiciones declaradas. Solo valida transición y construye drafts `traffic_campaign.requested/enabled`; enabled contiene destinationUrl. No consulta ni opera un proveedor. ENABLED no se usa para certificar campaña activa en Ads. |
| `app/web/prisma/schema.prisma:262-285` | Modelo interno TrafficCampaign: id, entrepreneurId, packageId?, personalizedChannelId?, status, name, source?, medium?, budgetAmount?, budgetCurrency, configuration, enabledAt?, createdAt/updatedAt. Presupuesto declarado no es gasto observado. JSON genérico no prueba un mapeo real. No campos explícitos de provider account/campaign/action, sincronización o resultados. |
| `app/web/server/services/businessEventService.ts:4-35`, `lifecycle.ts:19-29`, `:48-59`; Prisma `:287-305` | Drafts/eventos de operación y redirección externa, actor/subject/payload; modelo persistente con occurredAt y relaciones opcionales. No recibos de conversiones publicitarias ni resultados posteriores de WhatsApp. |
| `app/web/server/services/dashboardMetricsService.ts:10-33`; `dashboardFinancialMetricsCore.ts:72-112` | Agregación de leads + manual payment ledger, generatedAt y finanzas de pagos CONFIRMED por paidAt. No reporte de gasto/alcance/clics/conversiones de plataformas. Pagos de servicios PartnerHub no se atribuyen a campañas del partner. generatedAt no significa última sincronización de Ads. |

La búsqueda de `googleads.googleapis`, `analyticsdata.googleapis`, `runReport`, `conversion_action`, `customer_id`, `adwords` y usos no-test de TrafficCampaign en `app/web` no identificó un cliente de reporting ni rutas de campañas. Resultado limitado al código inspeccionado: no prueba ausencia de servicios externos fuera del repo, ni estado de conexiones/despliegue. PH-007A describe reporting GA4 planeado; PH-024 documenta validación manual histórica, no conexión de API en vivo hoy.

Faltan fuentes verificadas para cuenta/campaña/estado de proveedor, impresiones/clics/gasto, conversion actions y conteos atribuidos, fechas de extracción, moneda/huso del reporte, ventanas/modelos de atribución y conciliación transaccional por campaña. Todos son `unknown` actualmente, no cero.

## 3. APIs y autorización observadas

- `GET /api/internal/activation-leads`: `app/web/app/api/internal/activation-leads/route.ts:10-12`; lista leads, no métricas. No chequeo de identidad/rol dentro del handler inspeccionado.
- PATCH anterior: tampoco invoca autorización por request en ese handler. GET `/api/internal/dashboard/metrics`, `app/web/app/api/internal/dashboard/metrics/route.ts:8-21`, valida periodo y devuelve métricas internas; no scope tenant ni cliente Ads.
- `app/web/proxy.ts:25-63` bloquea `/api/internal` en el host público oferta.partnerhub.club; deja continuar en otros hosts. Separación de host no sustituye autorización de usuario/tenant. `app/web/server/auth.ts:1-14` es scaffold, no sesión implementada. No se verificó cobertura de Cloudflare Access de producción; no afirmar acceso público explotable ni protección completa con esta evidencia.
- Existe authorizer de Master Sites: `app/web/server/auth/masterSitesOperatorAuth.ts:37-69`, JWT Cloudflare Access y allowlist humana Super Admin. Es precedente para evaluar, no protección automáticamente heredada por Analytics ni decisión aprobada de reutilización.
- Requisito del futuro endpoint: identidad interna verificada, permiso explícito de lectura Analytics y resolución server-side del alcance antes de consultar/cachear proveedor. Denegar sin identidad/permiso y fallar cerrado ante mapeo ambiguo. No habilitar acceso de clientes/partners en esta fase.

## 4. Join autoritativo y aislamiento requerido

El flujo Business sí ofrece una identidad concreta: `masterSitesBusinessPreviewService.ts:582-618` obtiene `ownerSiteId` de `lead.siteId`, deriva sitio `${ownerSiteId}-business` y host `negocio.${domain}`; detecta identidades duplicadas. `:628-641` verifica entitlement por `activationLeadId === lead.id`. `:657-682` contrasta target `ownerKey === lead.id`, siteId, ecosistema BUSINESS, baseDomain y publicHost, y rechaza conflictos. `:704-726` comprueba source de ese siteId, ecosistema y host. `:818-820` explicita `activationLeadId = ownerKey = lead.id` en snapshot server-only.

Por tanto, para Business usar la tupla validada **activationLeadId/ownerKey + publication siteId + ecosystemType**, no solo el siteId raíz mostrado por la pantalla. Resolver con las fuentes autoritativas anteriores y conservar ownerKey solo servidor. El esquema Prisma usa entrepreneurId (`schema.prisma:147-163`, `:197-218`, `:262-277`), pero esta inspección no encontró equivalencia autoritativa entrepreneurId <-> lead.id; no asumirla ni migrar identidades aquí.

Falta un binding aprobado y versionado entre esa tupla y **provider + providerAccountId + providerCampaignId + conversionActionId/property/stream**. Guardar únicamente un ID de conversión o igualar dominio/nombre/UTM no resuelve propiedad ni aislamiento. El binding deberá aprobarse por operador autorizado y validar cuenta/campaña accesible; parámetros del navegador nunca seleccionan arbitrariamente cuenta o acción. Una campaña con múltiples destinos necesita atribución/split verificable por sitio o etiquetar el dato como account/campaign-scoped, no duplicarlo en cada partner. No repartir conversiones por estimación. Cache keys, paginación y auditoría deben incluir binding/tenant/ecosistema; no heredar IDs de otro ecosistema por fallback.

## 5. Contrato futuro de lectura (propuesta, sin endpoint implementado)

Propuesta para congelar en un ticket de contrato: GET interno dedicado, por ejemplo `/api/internal/analytics/active-campaigns?activationLeadId=<uuid>&ecosystemType=BUSINESS&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor=<opaque>`. Ruta ilustrativa; no implementada ni autorización para crearla ahora. Fechas inclusivas interpretadas en huso de cuenta declarado; devolver siempre periodo efectivo. Validar tamaño de ventana y paginación; sin cuerpo de mutación ni endpoint genérico proxy hacia Ads.

Respuesta mínima sugerida:

```ts
type Availability = 'available' | 'unknown' | 'unavailable';
type ObservedNumber = {
  value: number | null; // permitir fracciones de atribución del proveedor
  availability: Availability;
  reason: string | null; // código seguro, sin errores/tokens crudos
};
type ActiveCampaignRead = {
  schemaVersion: 1;
  scope: { activationLeadId: string; siteId: string; ecosystemType: string };
  period: { from: string; to: string; timeZone: string | null };
  generatedAt: string; // ensamblado de respuesta, no sincronización
  connection: {
    state: 'not_connected' | 'mapping_required' | 'ready' | 'permission_denied' | 'error';
    provider: 'google_ads' | 'meta_ads';
    accountDisplayRef: string | null; // proyección interna segura
  };
  freshness: {
    lastSuccessfulSyncAt: string | null;
    statusObservedAt: string | null;
    dataThrough: string | null;
    state: 'unknown' | 'fresh' | 'stale' | 'partial' | 'error';
  };
  campaigns: Array<{
    campaignRef: string; // binding opaco autorizado, no token/credencial
    providerCampaignId: string;
    name: string;
    providerStatus: string;
    activeQualification: string; // regla documentada basada en estado proveedor
    association: 'site_verified' | 'campaign_only';
    conversions: Array<{
      actionRef: string;
      actionName: string | null;
      source: 'google_ads_reporting' | 'meta_ads_reporting';
      semantic: 'contact_intent' | 'registration' | 'purchase' | 'other' | 'unknown';
      count: ObservedNumber;
      metricDefinition: string; // exacto: no mezclar conversions/all_conversions
      attribution: { model: string | null; window: string | null; dateBasis: string | null };
      purchaseEvidence: 'not_applicable' | 'provider_only' | 'payment_confirmed' | 'unknown';
    }>;
  }>;
  nextCursor: string | null;
  warnings: string[]; // disponibilidad, parciales y atribución; sin PII
};
```

Decisiones que deben acompañar el contrato definitivo:

- Solo listar campañas calificadas activas en la observación del proveedor; no basta `TrafficCampaign.ENABLED`, lead PAID ni publicación. “Habilitada” y “entregando” pueden diferir: decidir regla exacta de servicio/elegibilidad por proveedor antes de fijar filtro. Periodo de resultados e instante del estado son diferentes. Cache obsoleta se etiqueta como última observación, nunca activa ahora sin matiz. Campañas que tuvieron actividad histórica pero ya están pausadas quedan fuera de esta vista, salvo nuevo alcance aprobado.
- Una conexión ready sin filas consultadas no es “cero campañas”. `campaigns: []` significa resultado vacío solo tras lectura exitosa/completa del binding; en otros estados mostrar no disponible. Un cero numérico solo tras consulta exitosa para ese periodo/acción/scope; null para permiso faltante, no conexión, datos no expuestos, error o mapping pendiente.
- Fuente de cada tarjeta siempre visible. GA4/eventos landing se presentan en bloque separado con su propio property/stream/binding, periodo/frescura y nunca en `conversions` de Ads. Meta Pixel ID no es Meta Ads reporting. No sumar GA4 + Ads ni acciones primarias/secundarias o importaciones duplicadas sin definición y deduplicación aprobadas.
- Clic WhatsApp/CTA = intención, aunque el proveedor lo cuente como conversión. Conversación o registro real exige fuente independiente; la nomenclatura de una action no lo demuestra. `provider_only` permite mostrar “conversiones atribuidas por Google Ads” con aclaración, nunca “compras confirmadas”. Compras confirmadas solo con pago transaccional confiable, correlacionado al mismo resultado y tratamiento de duplicados/reembolsos; estado comercial de PartnerHub no basta.
- No ofrecer ROI/ROAS, CPA o rentabilidad. Futuras métricas de gasto, clics, impresiones o valores requieren campos opcionales tipados con disponibilidad, fuente, unidad/moneda y definición verificada; no se congela lista de métricas de proveedor sin source contract. ROAS requeriría ingreso atribuido y gasto compatibles; ROI además costes pertinentes.
- Mostrar periodo, fuente/cuenta segura, partner/sitio/ecosistema, estado observado, última sincronización exitosa y advertencias de datos parciales/retrasados/revisables. `lastSuccessfulSyncAt` no se sustituye por generatedAt ni analyticsVerified. Decidir TTL/SLA por fuente; no inventar promesa de tiempo real.
- Sin botones de crear, editar, pausar, activar, financiar o ajustar campañas/anuncios/budgets/bids. Refresco únicamente lee; no reutiliza PATCH de leads. Configuración GA4/Meta existente sigue separada y sin cambios en este ticket.

## 6. Permisos futuros y bloqueos

No se leyó documentación externa ni se validaron cuentas/API vigentes por la prohibición de requests externos de este ticket. Los siguientes son candidatos para revisión técnica vigente, NO scopes aprobados ni garantía de permisos de solo lectura:

- Google Ads: evaluar scope OAuth `https://www.googleapis.com/auth/adwords`, developer token y customer/login-customer mapping cuando corresponda. No asumir que OAuth ofrece un scope exclusivamente read-only: restringir usuario/cuenta a lectura y adapter a reporting/search; bloquear métodos mutate, uploads y operaciones de conversiones. Confirmar privilegios y documentación oficial en ticket autorizado antes de conexión.
- GA4 separado, si se aprueba: evaluar `https://www.googleapis.com/auth/analytics.readonly` y acceso lector a property/stream autorizado. Un Measurement ID no es property ID ni credencial de API.
- Meta reporting separado, si se aprueba: evaluar permiso `ads_read`, acceso de activo/cuenta, revisión de aplicación y mecanismo de token vigente. Pixel ID no concede permisos.
- Operador/CTO deben resolver titularidad y cuentas administradoras/cliente, campañas activas en alcance, binding/versionado y destinos compartidos, acción primaria/importada y deduplicación, huso/atribución, política de frescura y permisos del dashboard. Sin esas decisiones no hay datos verificables.
- Credenciales solo servidor, almacenamiento seguro aprobado, renovación/revocación y auditoría redactada; no en templates/config público/repo/logs/respuestas. No se solicitan ni configuran aquí. Consentimiento/eventos depende del hallazgo CDX-20261021-002; monitoreo no autoriza instalar tags ni subir conversiones.

## 7. Follow-up acotado y ownership

Propuestas para que CTO emita IDs nuevos; no son tickets activos ni autorización de ejecución:

1. **Contrato/binding y autorización — Codex**: cerrar solo modelo de lectura, autorización interna y asociación tenant/site/ecosistema/proveedor, con revisión de seguridad/CTO. Áreas: contrato nuevo y resolver server-only dedicado. Excluye UI, tracking, schema de pagos, publicación y otros contratos. Depende decisiones de sección 6; entrega contrato congelado y tests negativos de tenant/ambigüedad, no conexión real.
2. **Adapter/reporting Google Ads — Codex**: implementar solo backend read-only y caché scoped sobre contrato congelado, con fixtures y transporte simulado. Áreas nuevas del adapter/API/tests; excluye cuentas/campañas mutate, UI y tags. Decidir persistencia en su ticket, no asumir migración aquí. Gate separado de conexión/piloto requiere autorización externa explícita. Probar cero vs desconocido, permisos revocados, parcial/paginación, estado obsoleto y conversiones fraccionarias/ajustadas.
3. **Dashboard de monitoreo — Antigravity, request AGR nuevo obligatorio**: consume contrato aprobado con fixtures; solo componente de Analytics y tests frontend. Sin backend ni cambios GA4/Meta existentes. Puede avanzar en paralelo con adapter tras congelar contrato, con áreas no solapadas. Verificar ausencia de controles de campañas, periodos/frescura/errores y semántica de intención/compra.
4. **Revisión y validación de integración — Claude/owner único designado**: separada tras backend/UI; revisar tenant, read-only enforcement, fuentes y duplicados. Un piloto real requiere aprobación de cuenta/scope de Jairo; no viene autorizado por esta propuesta. Lectura GA4/Meta y conciliación de compras son tickets independientes futuros, no ampliar el adapter Google Ads.

Riesgos pendientes: ausencia de bindings/proveedores, autorización de Analytics no demostrada end-to-end, datos Ads desconocidos, clasificación de conversiones y fuente de compra no resueltas. No declarar lista para Ads la landing ni la campaña por este documento.

## 8. Verificación y archivos

- Lectura estática de componentes, rutas, servicios, Prisma y brain citados; búsquedas locales de clientes/reporting. Sin requests externos, secretos, runtime ni cuentas.
- Cambios limitados a este reporte y su request; scratch local ignorado `.local-secrets/sdd/CDX-20261021-003/task-1-report.md`.
- `git diff --check` y comprobación de archivos staged ejecutadas antes de commit; revisión documental propia contra las seis etapas del brief y límites de la especificación. Revisión independiente por orquestador pendiente.
- Build: **no ejecutado / no aplica a entrega documental**. No se afirma build o tests de producto verdes; no cambia código y no se generó output compartido.
- Follow-up requerido: sí, separado y sujeto a aprobación. Ningún cambio de producto incluido.
