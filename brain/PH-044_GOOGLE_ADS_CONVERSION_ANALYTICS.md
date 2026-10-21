# PH-044 — Conversiones de Google Ads en Analítica y Métricas

## Estado

Alcance de producto aprobado por Jairo el 2026-10-20. Integración, contrato de
datos e implementación pendientes; este documento no autoriza cambios en
cuentas externas ni en páginas de producción.

Aclaración explícita aprobada por Jairo el 2026-10-21: `Analítica y Métricas`
solo da seguimiento de lectura a campañas ya activas en las plataformas y sus
resultados. Nunca crea, edita, activa, pausa ni lanza campañas o anuncios;
tampoco cambia presupuestos ni pujas. La operación publicitaria permanece en
las plataformas, fuera del alcance de este módulo, no solo de la primera fase.

El descubrimiento documental `CDX-20261021-003` está completado y enlaza evidencia,
contrato futuro de lectura, bindings pendientes y follow-ups acotados:
[reporte de seguimiento de campañas activas](agent-requests/codex/reports/CDX-20261021-003_analytics_active_campaign_monitoring_spec_DONE.md).
Su revisión documental fue aprobada sin hallazgos; no implementa ni acredita una
conexión de reporting, datos de conversiones o cuentas externas disponibles.

## Resultado buscado

Extender el módulo interno `Analítica y Métricas` para que el operador pueda
consultar campañas ya activas y sus resultados, incluidas conversiones de Google
Ads cuando exista una fuente verificable por partner, sitio y ecosistema.
La vista de clientes/partners permanece fuera del alcance inicial, de acuerdo
con `PH-024`.

La configuración actual de IDs GA4/Meta y su verificación manual pertenecen al
tracking de páginas y se conservan sin cambios. No administran campañas ni
demuestran reporting externo. Conectar reporting de Google Ads, resolver su
autorización/binding y mostrar resultados requiere contratos y tickets futuros
aprobados. Instalar o modificar tags/eventos es un flujo separado; no es requisito
implícito ni autorización derivada del monitoreo de campañas existentes.

## Estado técnico observado

La inspección de `origin/main` al 2026-10-20 encontró:

- `analytics-and-metrics-view.tsx` muestra Google Ads como “Próximamente” y
  deshabilita el campo “Conversion ID”. No existe allí configuración ni
  reporte de conversiones operativo.
- La configuración de activación acepta `googleAdsConversionId` y el flujo de
  sincronización puede copiarlo a `integrations.googleAds.conversionId`.
- El esquema de generación acepta actualmente un `conversionId` no vacío, pero
  no define por sí solo una acción completa, consentimiento, evento, fuente,
  verificación ni reporte de Ads.
- `PH-040A` implementó el bloque base de Meta Pixel y explícitamente dejó Ads y
  los eventos personalizados fuera. Su existencia no prueba seguimiento de
  conversiones de Google Ads.
- GA4 y Google Ads son fuentes distintas. La configuración o verificación
  manual de GA4 no acredita que Ads haya recibido una conversión.

Por tanto, el placeholder no debe presentarse como función habilitada y un ID
guardado no debe mostrarse como integración publicada o verificada.

## Decisiones aprobadas por Jairo

1. La página `Analítica y Métricas` incorporará visibilidad de conversiones de
   Google Ads por partner/sitio/ecosistema, con estado y fuente claros.
2. Un clic a WhatsApp se representa como **clic / intención de contacto**. No
   se denomina conversación, registro, venta ni compra y no se infiere el
   resultado de la conversación.
3. Un clic en un CTA o enlace de compra no es una compra. Una conversión de
   compra requiere confirmación transaccional confiable y correlacionable con el
   evento; si no existe esa señal, el panel no reporta compras.
4. Los estados comerciales de PartnerHub (`PAID`, `CONVERTED` u otros) no se
   reutilizan como prueba de venta de productos del partner ni como conversión
   de campaña.
5. No se calculan ni muestran ROI o ROAS hasta disponer de inversión publicitaria
   real, autorizada y atribuida a la misma cuenta, período y alcance de datos.
6. El módulo nunca crea, edita, activa ni pausa campañas/anuncios ni modifica
   presupuestos o pujas. Tampoco se autoriza aquí crear/modificar conversiones,
   audiencias o configuración de cuentas en Google Ads.

## Requisitos funcionales

- Separar la configuración de seguimiento de la lectura de métricas: “tag
  instalado” y “conversiones consultables” son estados distintos.
- Listar solo campañas calificadas como activas por una observación verificable
  del proveedor. El estado interno `TrafficCampaign.ENABLED` no acredita esa
  condición. Mostrar cuándo se observó el estado y distinguirlo del periodo de
  resultados; una caché obsoleta no prueba actividad actual.
- Mostrar por partner, sitio/ecosistema y rango de fechas solo datos que tengan
  fuente identificada. Incluir la acción de conversión, fuente, período y
  frescura/última sincronización cuando estén disponibles.
- Distinguir `Pendiente`, `Configurado`, `Publicado`, `Verificado` y `Datos
  disponibles` solo cuando cada estado esté respaldado por evidencia; no inferir
  verificación por la mera existencia de un ID.
- Tratar la ausencia de datos, credenciales o permisos como “No disponible” o
  “Pendiente”, no como cero conversiones.
- Mantener los datos desglosados por ecosistema; nunca heredar el identificador
  o conversion action de otro partner o ecosistema.
- Evitar doble conteo si un mismo resultado se envía por Google Ads Tag y se
  importa desde GA4: cada acción deberá tener una única fuente primaria
  configurada y visible.
- Si el clic a WhatsApp se envía a Google Ads como conversión de optimización,
  etiquetarlo como intención de contacto/clic, no como resultado final de
  negocio. La clasificación como objetivo primario o secundario requiere una
  decisión de campañas separada; se recomienda secundario mientras no haya
  señal de resultado posterior.

## Privacidad y seguridad

- Mantener el módulo dentro del dashboard interno según `PH-024`; el acceso de
  partners/clientes requeriría un alcance y autorización separados.
- Credenciales OAuth/API y secretos de Ads se conservan únicamente en el
  servidor, con acceso mínimo; nunca en HTML generado, `config.js`, navegador,
  repositorio, logs o respuestas públicas.
- Asegurar el mapeo autorizado de tenant + `siteId` + ecosistema + cuenta/acción
  antes de leer o asociar métricas. Una petición para un partner no puede
  consultar datos de otro.
- Respetar el consentimiento de medición/publicidad aplicable. No disparar
  eventos publicitarios cuando el consentimiento requerido esté ausente o
  rechazado.
- No enviar a Analytics/Ads el teléfono, correo, identidad, contenido del
  mensaje de WhatsApp, texto de formulario, URL completa con parámetros
  sensibles u otra información personal. Registrar solo el evento y los datos
  mínimos no identificables aprobados.
- La lectura de reportes y cualquier validación inicial debe ser de solo
  lectura. No ejecutar cambios en una cuenta o campaña real como parte de este
  ticket documental.

## Decisiones técnicas pendientes antes de implementación

- Definir si los conteos se consultarán desde reporting de Google Ads, desde
  GA4 como fuente declarada, o desde ambas fuentes sin sumarlas; cada tarjeta
  deberá indicar claramente su origen.
- Confirmar titularidad y estructura de las cuentas Ads (cuenta administrada por
  PartnerHub, cuenta de cliente u otra) y su mapeo aislado por sitio.
- Aprobar el mecanismo de autorización, scopes mínimos, almacenamiento,
  renovación/revocación de credenciales y auditoría. No asumir que `conversionId`
  es suficiente ni reutilizar secretos de otros servicios.
- Definir el contrato completo de acción/etiqueta y su validación con la
  documentación oficial vigente, sin permitir scripts o código arbitrario del
  operador.
- Determinar qué ecosistemas y eventos se habilitan primero. En Business el
  primer evento candidato es el clic a WhatsApp; una compra queda bloqueada
  hasta existir señal transaccional autorizada.
- Definir huso horario, ventanas de atribución y tratamiento de conversiones
  ajustadas/retiradas según la fuente seleccionada.

## Fuera de alcance

- Crear/administrar cuentas de Google, campañas, grupos, anuncios, audiencias,
  pujas, presupuestos, etiquetas o acciones de conversión en cuentas reales.
- Lanzar, editar, pausar o financiar campañas.
- Automatizar Google Tag Manager, Conversion API, remarketing o sincronización
  de leads/ventas offline.
- Reportar conversaciones o ventas derivadas de WhatsApp sin una fuente de
  confirmación independiente.
- ROI, ROAS, costo por adquisición o rentabilidad sin datos de inversión
  completos y correlacionados.
- Exponer métricas a partners o usuarios finales.
- Alterar la configuración, publicación o medición instalada de páginas
  existentes sin un ticket y autorización separados.

## Secuencia de trabajo recomendada

1. **Contrato y seguridad — Codex:** escoger fuente de reporte, titularidad de
   cuentas, mapeo tenant/sitio/ecosistema, credenciales, evento y deduplicación.
   Requiere revisión arquitectónica y de seguridad antes de tocar secretos o
   datos reales.
2. **Consulta read-only — Codex:** adapter/reporting y endpoint interno con
   autorización, aislamiento por partner/sitio/ecosistema y respuesta con
   fuente/período/frescura; sin escritura a Google Ads. Probar primero con
   fixtures; conexión/piloto real requiere autorización independiente.
3. **Dashboard — Antigravity:** crear request AGR separado después de congelar
   el contrato; mostrar campañas activas, estados y métricas reales sin inventar
   cifras ni confundir clics con ventas. Puede avanzar con fixtures en paralelo
   al adapter sobre el contrato congelado, con archivos no solapados. No añadir
   controles operativos de campañas ni alterar la configuración GA4/Meta actual.
4. **Revisión e integración:** Claude revisa seguridad, privacidad, duplicados y
   semántica; una validación piloto con Ads real requiere autorización
   independiente de Jairo y una cuenta de prueba/alcance explícito.

**Tracking de páginas — flujo independiente:** cualquier tag/evento nuevo exige
ticket y contrato de consentimiento propios; no bloquea por defecto la lectura
de campañas existentes ni queda autorizado por esta secuencia. No publicar
sitios de clientes ni crear acciones de conversión como parte del reporting.

## Aceptación del diseño

- El contrato distingue clic/intención de contacto, registro real y compra
  confirmada.
- No se atribuyen ventas por clics, estados del CRM operativo ni apertura de
  WhatsApp.
- El tablero puede explicar de qué cuenta/acción, fuente, período y ecosistema
  proviene cada dato.
- No se presenta ROI/ROAS sin inversión autorizada ni eventos con PII.
- La lectura queda restringida y aislada; el monitoreo no escribe en Google Ads
  ni ofrece controles de campañas, presupuestos o pujas.
- Las fases backend, dashboard y validación externa quedan separadas en tickets
  con archivos y dependencias no solapados.

## Bloqueadores actuales

- No existe evidencia de conexión/reporting de Google Ads en el repositorio.
- Titularidad de cuenta, credenciales de lectura, fuente de reporting y eventos
  de compra confirmada permanecen sin definir.
- El placeholder y los IDs de configuración existentes no deben interpretarse
  como capacidad desplegada.
