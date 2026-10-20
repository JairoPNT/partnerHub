# Master Sites — entrega manual de Negocio

Estado: propuesta para aprobación de especificación. Ticket de diseño: CDX-20261020-006.

## Objetivo acordado

Jairo necesita vender y entregar a grupos pequeños desde Master Sites: seleccionar una plantilla aprobada del proyecto, asignarla a partners con Negocio contratado o cortesía vigente y publicar los seleccionados sin comandos. Se empieza por BUSINESS. No se importan ZIP ni se construye un catálogo de variantes en esta entrega.

Éxito: un Super Admin entrega Negocio a un partner elegible desde la interfaz; ve la URL y el resultado real del worker. Una selección errónea o un dato ausente nunca publica sobre otro partner ni sobre Producto/raíz.

## Evidencia del estado existente

- `master-site-management-view.tsx` ya tiene selector PRODUCT/BUSINESS/PERSONAL_BRAND; BUSINESS es principalmente informativo.
- La lista de receptores actual mezcla ecosistemas y preselecciona todos. Su acción de replicación omite `ecosystemType` y el backend adopta PRODUCT por defecto. Ese camino no se reutilizará para la nueva operación Business.
- `productPageReplicationService` requiere fuentes previamente generadas: no incorpora por sí solo un partner nuevo con servicio contratado.
- `ecosystemTemplateResolver` reserva exactamente un master por ecosistema; BUSINESS usa `ganomaster-business`.
- PR #210 corrigió contenido Business completo y póster del Producto del mismo propietario. Claudia se publicó por generación + cola guardada; no fue necesario publicar primero el master en su dominio de muestra.
- La autenticación actual valida Cloudflare Access, pero no demuestra un rol aplicativo Super Admin. La nueva acción no debe asumir que cualquier identidad autenticada tiene ese privilegio.

## Alternativas y decisión recomendada

1. **Reutilizar generador y worker con un flujo manual Business:** menor alcance, entrega comercial individual/grupo pequeño, mantiene los controles ya probados. Recomendada.
2. Completar primero la automatización integral de altas: más dependencias antes de una entrega; se pospone.
3. Biblioteca con ZIP, varias variantes y diseñador: nuevo subsistema de importación/seguridad/versiones; se pospone.

## Experiencia de la primera entrega

1. Abrir Master Sites y elegir Negocio. Producto y Marca Personal siguen visibles, sin prometer nuevos controles que aún no existan.
2. Seleccionar la plantilla Business aprobada del proyecto y abrir su vista previa. Mostrar versión disponible y si cambió desde la revisión del operador. Una única opción inicial; no simular varias plantillas.
3. Mostrar partners a partir del registro de Partners, no solo de fuentes generadas. Cada fila indica servicio habilitado, datos, dominio, destino y publicación actual, con motivo concreto de bloqueo.
4. Empezar con selección vacía. Seleccionar explícitamente un partner o un grupo pequeño, revisar nombres/URLs y confirmar la versión para esa selección.
5. Si falta destino, el Super Admin puede usar una acción explícita **Preparar destino de Negocio** para los seleccionados. Reutiliza provisioning Hostinger; no compra dominios, no cambia la raíz ni publica páginas. Solo continúa cuando DNS/SSL/destino estén READY; si la operación queda pendiente, se muestra y puede revisarse sin reiniciar todo.
6. **Generar y publicar seleccionados** prepara únicamente fuentes Business de los partners confirmados, guarda la evidencia de asignación y encola los trabajos existentes. El backend no acepta contenido libre, rutas remotas, URLs destino ni números de WhatsApp enviados por el navegador.
7. Mostrar estados separados: bloqueado, destino pendiente, listo, en cola, publicando, publicado/verificado y fallido. Un HTTP 201 de generación o una cola aceptada no significan publicación terminada.

## Reglas comerciales e identidad

- Derecho al servicio mediante entitlement fresco: BUSINESS incluido y estado comercial conocido; pago Wompi validado, pago manual confirmado o cortesía vigente según los servicios actuales. No se crean aprobaciones comerciales nuevas ni se exige un consentimiento adicional.
- Cortesía habilita elegibilidad pero no genera/publica ni marca converted por registrarla. La publicación solo se solicita con la acción manual del operador.
- Partner activo, `siteId` estable y dominio asignado por PartnerHub en su registro. No se pide dominio al usuario del onboarding ni se aceptan dominios externos en este alcance.
- Derivar `ownerKey` del ID real del lead, `siteId=<partner>-business`, `publicHost=negocio.<dominio>`. Un target previo debe coincidir exactamente con propietario, ecosistema y dominio. Ambigüedad o hosting anterior bloquean; no hay reasignación silenciosa.
- Datos desde onboarding/registro autorizado: nombre, marca y WhatsApp validado sin conflicto. Integraciones del partner no se heredan del master. No se requiere fuente ni contratación de Producto para entregar solo Negocio.
- Usar el VSL aprobado y el resolvedor de póster existente; no imponer imágenes de otro cliente. Los CTA Business se derivan del WhatsApp del partner y no incluyen `purchaseUrl` ni checkout de Producto.
- Conservar datos autorizados de una fuente Business existente. No regenerar un sitio al día sin una solicitud expresa de actualización de esa fila.

## Seguridad y operación

- Endpoints nuevos exclusivos del operador: JWT Cloudflare verificado (emisor/audiencia/firma), identidad humana y autorización Super Admin comprobada en servidor mediante allowlist explícita de correos verificados. Sin configuración, denegar. No confiar en roles o emails enviados por el frontend ni habilitar service tokens para este control manual.
- Usar la audiencia administrativa existente; no ampliar reglas de Cloudflare ni exponer el endpoint públicamente para hacerlo funcionar. Configurar la identidad real de Jairo antes del gate productivo; no inferirla del correo de un partner.
- Preview read-only sin generación ni proveedores. Confirmación de publicación ligada a versión/hash del master, partner, entitlement, datos y destino revalidados; si cambiaron, responder conflicto y refrescar la revisión.
- Bloqueo por sitio antes de mutar fuente/paquete. No generar si hay un trabajo activo para ese sitio ni publicar concurrentemente contra el mismo destino. Controlar la carrera entre doble click y peticiones de distintos procesos; mantener los locks/leases existentes del worker.
- Procesar por partner, con resultados independientes y reintento explícito. Un fallo parcial nunca repite automáticamente partners ya completados. Reusar idempotencia del trabajo; no editar jobs/journals directamente.
- Historial durable de quién solicitó, plantilla/versiones, partner, momento, outcome y job. Sin credenciales, cookies, tokens, rutas de hosting ni detalles internos innecesarios en las respuestas de UI.
- No modificar el comportamiento automático ya existente mediante este ticket. Abrir Master Sites, seleccionar una pestaña o asignar una cortesía no dispara la nueva operación.

## División y dependencias

1. **Codex — contrato y backend manual Business:** preview de elegibilidad/versiones, preparación explícita de destino y ejecución manual de generación/cola; autorización, consistencia, locks y pruebas. Áreas: nuevos servicios/routes bajo Master Sites y tests, adapters mínimos a servicios existentes. Excluye UI, plantillas, Prisma y compra de dominios.
2. **Antigravity — operación Business en Master Sites:** selector existente, preview, lista elegible, selección vacía, confirmación y seguimiento de jobs. Request separado AGR-20261020-001; no modifica backend/auth/plantillas. Puede avanzar en el diseño de interacción en paralelo después de aprobar el contrato; integración funcional depende del backend.
3. **Revisión/integración — ticket independiente:** revisar auth/aislamiento y UX, verificar build y probar el flujo con un partner autorizado. Claudia ya publicada sirve para comprobar estado al día sin republicarla por defecto.

No se ejecutan dos tickets sobre los mismos archivos. Producto/Brand, catálogo multivariantes y demás elementos futuros se incorporan con tickets separados; no se inventan tipos de ecosistema ahora.

## Verificación requerida

- Sin sesión, usuario no autorizado, token de servicio y configuración de Super Admin ausente: ninguna mutación.
- Pago no confirmado, cortesía vencida/revocada, partner archivado, WhatsApp conflictivo o dominio ausente: bloqueo explicado.
- Partner con Negocio pero sin fuente Producto/Business: aparece y puede prepararse sin checkout ni identidad heredada.
- Propietario/dominio/target incompatibles o migrados sin reconciliar: bloqueo antes de escribir.
- Master/datos/entitlement cambian tras preview, doble click y jobs activos: conflicto/idempotencia, sin sobreescritura concurrente.
- Grupo con resultados mixtos: estados individuales, sin publicar no seleccionados y sin repetir completados.
- Regresiones reales de generación/regeneración, vídeo/póster/WhatsApp, cola/provisioning, lint/build y revisión independiente antes del merge.
- La verificación productiva debe comprobar contenido/CTA/video y la fila del dashboard, no solamente HTTP 200.

## Fuera de alcance

Importador de código o ZIP, marketplace, variantes por cliente, editor visual nuevo, reescritura de automatizaciones, cambios de cobros/cortesías, Personal Brand, republicación masiva, compra de dominios, campañas o inversión publicitaria. El detalle menor del pie de duración del VSL se registra en otro request.

## Gate pendiente

Jairo debe revisar esta especificación. Su aprobación permite preparar el plan técnico y cerrar el contrato frontend/backend; no se ha implementado ni desplegado todavía este nuevo control de Master Sites. La configuración de autorización Super Admin debe verificarse antes de cualquier prueba productiva.
