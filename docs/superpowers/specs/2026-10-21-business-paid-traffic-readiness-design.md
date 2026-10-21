# Diseño: preparación de páginas Business para tráfico pagado

Estado: aprobada por Jairo el 2026-10-21. Aclaración aprobada: Analítica y Métricas solo monitorea campañas activas y sus resultados; no crea ni administra campañas. La aprobación cubre la especificación y sus límites, no autoriza publicación, cambios de DNS/SFTP ni acciones en plataformas de Ads.

## Objetivo

Habilitar una página Business clara, honesta y verificable para recibir tráfico pagado, empezando por negocio.claudiacalero.pro, y convertir sus reglas seguras en la norma de las próximas páginas Business. El perfil de contenido de la landing debe quedar asociado al partner y mantenerse fuera de la plantilla compartida como dato personal.

## Contexto comprobado en el repositorio

- La rama principal contiene el flujo de preparación y publicación manual de Business en Master Sites (PR 216 y PR 218) y la preservación de contenido del master durante generación/regeneración (PR 209, integrado después).
- El ensamblador actual de Master Sites obtiene identidad, WhatsApp, parte de SEO, theme, VSL y medición desde fuentes del servidor; no expone un contrato completo para titulares, beneficios, imágenes, avisos de transparencia y variaciones por campaña.
- La plantilla compartida Business aún contiene copy heredado de ingresos residuales, libertad financiera, urgencia, registro y afirmaciones comerciales que no son apropiadas como valores por defecto sin evidencia.
- La plantilla canónica Business de `origin/main` no contiene handlers `click_cta`/`WhatsAppClick` ni un cargador GA4; el commit Antigravity `cc73cff` añade esos eventos. El generador sí inyecta Meta Pixel y PageView en HTML cuando hay Pixel ID. Los paquetes pueden copiar un master runtime externo al repositorio; no se infiere la instrumentación pública de este hallazgo. La auditoría CDX-20261021-002 debe distinguir esos orígenes antes de afirmar consentimiento o preservación de medición.
- Existe un resultado de Antigravity AGR-20261020-003 en una rama/commit informado por el usuario, pero no se confirmó su fusión a main ni evidencia pública. Debe revisarse como trabajo existente; no repetirlo a ciegas ni asumir que está desplegado.

## Requisitos aprobados por el producto

1. Reemplazar la dedicación fija por el texto acordado para Claudia: “Puedes empezar desde 2 horas semanales, con acompañamiento desde el inicio. La dedicación para desarrollar la actividad depende de tus objetivos y tareas; no garantiza resultados”.
2. El texto del CTA debe describir su destino real. Para WhatsApp usar “Conocer la oportunidad” o “Hablar por WhatsApp”. Usar “Registrarme” solo cuando haya un flujo real de registro y el destino esté configurado y validado.
3. Quitar promesas o garantías de ingresos, resultados y plazos; entre ellas libertad financiera, ingresos residuales sostenibles, ganar cada vez que alguien consume café y resultados desde las primeras semanas.
4. Cerca del CTA principal informar que es una actividad independiente de venta directa, requiere inversión y trabajo comercial, ofrece acompañamiento y no es una oferta de empleo. No publicar montos.
5. Mostrar afirmaciones verificables (inventario, logística, formación, presencia internacional, registros sanitarios o respaldo financiero) solo si existe evidencia aprobada, específica para la afirmación y vigente. Sin evidencia, ocultarlas.
6. Eliminar escasez o urgencia no demostrable como “cupos limitados” y “asegura tu posición”.
7. Mostrar duración del video solo cuando esté validada contra el medio cargado. Si no se valida, el título visible será “Ver presentación de negocio”. No ocultar el VSL actual durante la corrección: Jairo decidió mantenerlo visible.
8. Poder adaptar encabezado, beneficios, imágenes y colores para la campaña del partner. Para Claudia, la dirección aprobada es autonomía, universitarios, acompañamiento y estilo juvenil azul, lima y blanco; no inventar resultados, afiliaciones ni atributos de producto.
9. Identificar a Claudia y describir la relación comercial real con lenguaje verificable; no presentar la página como portal oficial corporativo independiente.
10. Ocultar casos de éxito, testimonios, cifras y resultados de ejemplo mientras no exista contenido real verificable y permiso aplicable.
11. Mantener consentimiento e identificadores/eventos de GA4 y Meta existentes cuando corresponda. El evento de WhatsApp debe significar únicamente clic/intención; nunca conversación, registro, compra o venta. No enviar PII.
12. Validar desktop y móvil, video, legibilidad, destinos, aviso de privacidad, consentimiento y recepción/nombre de eventos. Mantener separados Producto, Business y Personal Brand.

## Contrato funcional propuesto

### Fuente y límites de datos

- El servidor resuelve partner, siteId, ownerKey, host, entitlement, WhatsApp y permisos desde fuentes autoritativas existentes. El navegador no puede elegir ni sobrescribir identidad, dominio, WhatsApp, ownerKey, entitlement o datos de proveedor.
- Las modificaciones de contenido Business las puede realizar únicamente Super Admin desde Master Sites. No se añade edición de contenido al onboarding ni al cliente.
- El servicio existente `productPageSourceService` guarda la configuración autoritativa por sitio en `.sources/{siteId}.json`. El perfil `businessLandingContent` se agrega a ese mismo documento con compare-and-swap y el lock por sitio ya existente; no crear una tabla, sidecar, duplicado ni nuevo registro de identidad. Si no se puede conservar el perfil sin pisar otros campos, detenerse y elevar una decisión antes de cambiar persistencia.
- La plantilla maestra compartida conserva valores genéricos, seguros y sin datos personales. Las variaciones aprobadas de Claudia se inyectan en su generación Business, no se codifican en el master común.
- Para el MVP se propone un perfil activo de contenido de landing por partner, con una revisión/hash. Ese perfil no crea ni administra campañas publicitarias. Las campañas ya activas en Meta/Google pueden apuntar a la misma landing vigente; no habrá variantes concurrentes, A/B ni selección por query string hasta que exista un ticket de atribución y seguridad aprobado.

### Analítica y Métricas

- Analítica y Métricas es una superficie de seguimiento y lectura: su alcance de producto incluye mostrar campañas que ya estén activas en las plataformas conectadas y sus datos resultantes, incluidas conversiones de Google Ads cuando la fuente esté disponible.
- No crea, edita, activa, pausa ni lanza campañas, conjuntos de anuncios o anuncios; tampoco cambia presupuestos ni pujas. La operación publicitaria permanece en las plataformas correspondientes y fuera de este alcance.
- Los controles de Master Sites descritos abajo editan únicamente el contenido de la landing Business del partner. No crean ni cambian campañas publicitarias en Meta o Google.
- Un ticket separado de documentación/descubrimiento registra el estado de la pantalla actual, las fuentes y límites de datos, tenant boundaries, frescura y el contrato de lectura requerido. No llama APIs de Ads ni configura credenciales; la conexión e implementación quedan para tickets posteriores y aprobación independiente.
- Las opciones actuales para configurar IDs de medición de GA4/Meta no son controles de campañas. No se modificarán en estos tickets.

### Configuración por partner

El objeto persistido en la fuente por sitio se llamará `businessLandingContent`. Para que backend, plantilla y Master Sites compartan un contrato pequeño y estable, su forma del MVP será:

```ts
type BusinessLandingContent = {
  hero: {
    headline: string;       // 1–160 caracteres
    subheadline: string;    // 1–400 caracteres
    desktopImageUrl?: string;
    mobileImageUrl?: string;
  };
  benefits: Array<{
    title: string;          // 1–80 caracteres
    description: string;    // 1–240 caracteres
  }>;                       // 1–4 elementos
  theme: {
    fontPreset: "executive" | "modern" | "editorial" | "friendly" | "premium" | "minimal" | "serif-chic" | "romantic-serif" | "luxury-serif";
    palettePreset: "cobalt-cyan" | "emerald-slate" | "coffee-gold" | "rose-graphite" | "indigo-lime" | "teal-navy" | "wine-blush" | "forest-mint" | "charcoal-amber" | "sky-stone";
  };
  dedicationText: string;  // 1–300 caracteres
};
```

Las imágenes son opcionales y solo pueden apuntar a HTTPS bajo `media.partnerhub.club/comunes/business/`; el editor no acepta una URL arbitraria. Para Claudia, `dedicationText` debe usar el texto exacto aprobado en el punto 1. No se almacenan etiquetas, IDs ni presupuestos de campaña.

El contrato permite valores validados para:

- encabezado y subencabezado;
- 1–4 beneficios;
- imágenes desktop/móvil del origen aprobado;
- presets de tema oficiales;
- texto de dedicación.

El aviso de transparencia y el destino/etiqueta aprobados de CTA no son editables por partner; la plantilla los mantiene siempre. No habrá toggles para afirmaciones, testimonios o casos de éxito mientras no exista una fuente de evidencia aprobada. El título del VSL será genérico; la duración queda fuera del perfil y solo podrá mostrarse tras verificación del activo.

Como protección de entrada, el perfil rechaza las afirmaciones sin evidencia ya identificadas para esta plantilla: “libertad financiera”, “ingresos residuales sostenibles”, “ganas cada vez que alguien toma café”, “resultados desde las primeras semanas”, “cero inventarios”, “logística 100% cubierta”, formación “sin costo”, presencia internacional, registros sanitarios y respaldo financiero; también “cupos limitados”, “asegura tu posición” y la dedicación fija “8 a 12 horas”. Esta lista reduce regresiones conocidas, pero no reemplaza la revisión editorial humana ni certifica por sí sola la veracidad de texto nuevo.

Si un valor falta o no supera validación, se usa el fallback neutral y seguro del master o se oculta la sección. No interpolar HTML ni renderizar valores de configuración con innerHTML. Crear nodos DOM y asignar texto como texto. Evitar URL schemes no seguros y hosts de medios no aprobados.

El endpoint de contenido usa `GET /api/internal/master-sites/business/content?activationLeadId=<uuid>` y `PUT /api/internal/master-sites/business/content`. El cuerpo del PUT contiene únicamente `{ activationLeadId, expectedRevision, profile: BusinessLandingContent }`; identidad de sitio/partner, host, WhatsApp y entitlement se obtienen del servidor. Respuestas proyectan únicamente displayName, siteId, publicHost, revisión y perfil seguro. Guardar no genera ni publica.

### Reglas de contenido y eventos

- Acción WhatsApp: enlace derivado de número/mensaje del partner validado por el servidor; etiqueta permitida de intención de contacto.
- Acción de registro: solo si existe un destino de registro real, revisado y aprobado; de lo contrario no mostrarla.
- Afirmaciones comerciales: desactivadas por defecto; habilitación exige evidencia revisada para esa afirmación. Una afirmación no se considera validada por estar presente en el master actual.
- Medición: clic CTA/WhatsApp no equivale a conversación ni a conversión comercial. Eventos sin identificadores personales ni datos del mensaje.
- El ticket de auditoría de consentimiento será de solo lectura. No cambiar la carga de GA4/Meta ni su consentimiento en el ticket de copy/configuración; un follow-up separado debe implementar lo que la auditoría confirme.

## Flujo esperado

1. Super Admin abre Master Sites > Business y selecciona explícitamente el partner.
2. La app carga el perfil vigente desde backend; identidad y entitlement vienen del servidor.
3. Super Admin ajusta el contenido de la landing para la campaña publicitaria, revisa el texto y guarda una revisión; guardar no genera ni publica.
4. La vista previa valida el config y muestra contenido final; no ejecuta proveedores ni publica.
5. Una acción independiente genera el paquete para ese partner. Una publicación existente requiere confirmación explícita del flujo actual de Master Sites.
6. Revisión independiente verifica el código y el paquete generado. Luego el despliegue de PartnerHub lo realiza el operador.
7. La publicación de la landing de Claudia y su verificación pública son un gate separado. No declarar lista la campaña por un merge, build o job encolado.

## División de trabajo y dependencias

### CDX-20261021-001 — Perfil de contenido Business por partner

Owner: Codex Backend Lead. Un solo resultado: exponer, validar y llevar un perfil de contenido Business site-scoped desde una fuente persistida autoritativa a la generación, bajo el permiso Super Admin. No toca UI ni archivos de la plantilla. Aprobado para implementación con este diseño. Si el almacenamiento existente no sirve, detenerse y reportar antes de crear esquema nuevo.

### AGR-20261021-001 — Plantilla Business segura para tráfico pagado

Owner: Antigravity. Un solo resultado: renderizar en la plantilla Business los valores neutros/seguros y el contrato del perfil de contenido congelado en esta especificación. Solo archivos de la plantilla Business y sus tests. Puede correr en paralelo con CDX-001 porque no modifica backend ni UI de PartnerHub. Revisar la rama AGR-20261020-003 para reaprovechar trabajo sin asumir que está fusionado.

### AGR-20261021-002 — Controles de contenido Business en Master Sites

Owner: Antigravity. Un solo resultado: editar y previsualizar el perfil de contenido de la landing del partner en Master Sites, solo Super Admin. No crea ni administra campañas publicitarias. Depende del contrato API/CDX-001 fusionado. Archivos de frontend Master Sites y tests frontend; excluye backend y plantilla HTML/CSS/JS.

### CDX-20261021-002 — Auditoría de consentimiento y eventos

Owner: Codex Backend Lead. Un solo resultado: trazar cómo se aplica consentimiento a GA4 y Meta en el flujo Business y documentar eventos y puntos de carga. Solo lectura en runtime; no cambiar tracking, campañas, IDs, proveedor ni página. Es independiente y puede correr en paralelo. Sus hallazgos son gate para afirmar consentimiento o cambiar medición.

### CDX-20261021-003 — Descubrimiento de Analítica y Métricas de campañas activas

Owner: Codex Backend Lead. Un solo resultado documental: inventariar la pantalla y fuentes existentes, y definir la superficie de seguimiento de campañas ya activas con conversiones de Google Ads y datos resultantes. Solo lectura del repositorio; sin APIs externas, credenciales, acciones de campaña ni cambios de producto. No proponer botones de crear/editar/activar/pausar anuncios.

Después de cada PR se requiere revisión independiente con findings reproducibles. Los tickets de documentación/auditoría entregan evidencia y decisiones requeridas. La integración final se agenda en un ticket distinto cuando existan los reportes y PRs; ese ticket compara el contrato real, prueba la generación de Claudia y verifica fallos/rollback sin publicar. No crear aún el ticket de integración para no fijar supuestos antes del resultado.

## Criterios de aceptación

- Los fallbacks compartidos no afirman ingresos, resultados, escasez o registro corporativo que no exista.
- La dedicación y aviso transparente de Claudia aparecen exactamente como aprobados, junto al CTA principal.
- CTA y destino coinciden; no hay “Registrarme” apuntando a WhatsApp.
- No aparecen claims, casos de éxito o testimonios sin evidencia aprobada.
- La duración solo aparece si coincide con metadatos verificados del activo; si no, se muestra “Ver presentación de negocio”.
- El contenido de landing de Claudia no modifica las páginas de otros partners ni Producto/Personal Brand.
- Solo Super Admin puede guardar; un save/preview no genera, publica ni llama a proveedores.
- La vista previa y paquete generado usan texto como texto y URLs de medios permitidas.
- Los eventos se clasifican como clic/intención, sin PII ni afirmación de conversión. Consentimiento queda según auditoría, no asumido.
- Pruebas desktop/móvil, privacidad/consentimiento, accesibilidad básica y regresiones de plantilla pasan.
- Evidencia pública final y aprobación de gates se documentan por separado antes de anunciar que Claudia está lista para Ads.

## Decisión registrada

Jairo aprobó el alcance de un perfil de contenido de landing activo por partner para el MVP. No se implementarán variantes simultáneas/A-B ni selección por query string. Analítica y Métricas solo dará seguimiento a campañas publicitarias ya activas y sus resultados; la edición de contenido en Master Sites no opera cuentas de Ads.

## No alcance

- No comprar ni cambiar dominios, DNS, SFTP, hosting, campañas, anuncios, presupuestos, conversiones externas ni cuentas de Ads.
- No cambiar Product ni Personal Brand.
- No reemplazar el video ni ocultarlo durante correcciones.
- No crear testimonios, cifras, pruebas de resultados, afiliaciones o claims nuevos.
- No emitir certificación legal o de cumplimiento por estos tickets.
- No desplegar ni publicar negocio.claudiacalero.pro como parte de esta especificación.
