# PH-032 - Integracion de tres ecosistemas en PartnerHub

## Objetivo

Integrar tres productos administrables sin crear tres plataformas separadas:

1. **Producto**: landing comercial de producto.
2. **Negocio**: pagina de negocio con VSL.
3. **Marca personal**: perfil y ecosistema personal con enlaces y bloques configurables.

## Decision de arquitectura MVP

Cada empresario tiene un `ecosystemType` activo: `PRODUCT`, `BUSINESS` o `PERSONAL_BRAND`.
El sistema puede admitir mas de uno en el futuro, pero el MVP debe operar con un ecosistema principal y dejar preparada la relacion para ampliacion.

Cada ecosistema tiene:

- una plantilla maestra independiente;
- una configuracion propia del sitio;
- un destino de publicacion propio;
- una version/historial de generacion y publicacion;
- los mismos contratos de identidad, contacto, SEO, analytics y tema visual cuando apliquen.

`ganomaster.pro` queda reservado exclusivamente como master de `PRODUCT`. Los masters de `BUSINESS` y `PERSONAL_BRAND` tendran identificadores y dominios separados cuando se habiliten.

## Reglas de replicacion

- La replicacion se ejecuta por ecosistema, nunca mezclando plantillas.
- La interfaz debe permitir replicar un ecosistema especifico o los ecosistemas seleccionados.
- Un master nunca aparece como destino de su propia replicacion.
- Se conservan los datos personales, enlaces, integraciones y tema del cliente.
- Se reemplaza solo la estructura y el contenido comun autorizado por el master.
- Toda replicacion requiere confirmacion y muestra previamente los destinos.

## Referidos

El programa conserva la regla de un mes de servicio por cada dos referidos efectivos.

- El codigo GanoExcel propio y el codigo del invitador se capturan en onboarding/detalle.
- Una vez asignados, no se editan desde el dashboard operativo.
- Un codigo desconocido puede crear un invitador provisional con nombre y codigo.
- El referido permanece pendiente hasta completar onboarding y confirmar pago.
- Solo un referido pagado y vinculado cuenta como efectivo.
- Los datos de prueba deben eliminarse del historial antes de activar la vista real.

## Marca personal: estrategia de personalizacion

No se construira un editor libre. Se usara una plantilla fija con bloques activables y limites claros:

- perfil principal;
- propuesta/biografia;
- negocios o servicios, con un numero maximo inicial;
- enlaces sociales y externos;
- eventos o agenda mediante enlaces externos;
- llamada a WhatsApp o contacto;
- SEO, analytics y tema visual.

Cada bloque tendra `enabled`, orden y campos definidos. Los enlaces se almacenan como datos, no como HTML libre. Los cambios estructurales siguen perteneciendo al master.

## Orden de trabajo

1. Contrato de ecosistema y datos administrativos.
2. `/master-site` con tres pestañas y estado por master.
3. `/partners` con ecosistema visible, replicacion por pestañas y referidos fuera de la tabla principal.
4. Limpieza de datos de prueba de referidos.
5. Plantilla Business/VSL.
6. Plantilla Personal Brand con bloques configurables.
7. Prueba operativa de cada ecosistema y replicacion selectiva.

## Dependencias

Antes de publicar las nuevas vistas, backend debe soportar de forma consistente `ecosystemType`, masters por ecosistema, destinos por ecosistema, y bloqueo de codigos de referido ya asignados. Las migraciones no deben ejecutarse sin ticket backend aprobado.

## Estado de implementacion 2026-08-06

- El backend ya normaliza `ecosystemType` con los valores `PRODUCT`, `BUSINESS` y `PERSONAL_BRAND`.
- Los masters quedan separados por identificador: `ganomaster`, `ganomaster-business` y `ganomaster-personal-brand`.
- La generacion de clientes usa el master correspondiente al ecosistema; la generacion de un master usa la plantilla canonica.
- La replicacion filtra por ecosistema y excluye siempre los tres masters como destinos.
- La asignacion de ecosistema, codigo propio y codigo de invitador queda protegida despues de vincular el sitio o asignar el referido.
- Un invitador provisional creado por codigo desconocido no genera beneficio hasta que exista como empresario registrado.
- Build verificado con `npm.cmd run build`: 30 rutas generadas correctamente.

## Coordinacion frontend paralela

Las solicitudes de Antigravity ya separan el trabajo por responsabilidad y pueden ejecutarse en paralelo:

- `AGR-20260806-001`: shell administrativo de tabs, ecosistemas y operacion de partners.
- `AGR-20260806-002`: plantillas HTML/CSS/JS de Business/VSL y Personal Brand, con temas PH-025.
- `AGR-20260806-003`: editor acotado y preview de bloques de Personal Brand.

Codex no duplica esas solicitudes ni modifica UI. Si un reporte requiere ajustes, se crea un nuevo request con ID nuevo.