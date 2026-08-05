# PH-026 - PartnerHub Content Engine MVP

## Estado

Documentado para plan de trabajo. No implementado.

## Objetivo

Crear un modulo dentro de PartnerHub para ayudar a empresarios emergentes a generar, organizar, reutilizar y medir contenido para redes sociales sin construir todavia una herramienta completa tipo Metricool.

El objetivo inicial no es autopublicar ni conectarse a redes sociales, sino ayudar al empresario a mantener consistencia, producir mejores ideas, reciclar contenido y aprender que tipo de publicaciones generan mas interes.

## Propuesta de Valor

El modulo debe convertir informacion basica del negocio en:

- Ideas de contenido.
- Hooks.
- Guiones cortos.
- Captions.
- CTAs.
- Hashtags sugeridos.
- Calendario simple de publicacion.
- Recomendaciones basicas de reciclaje.

Debe sentirse como un asistente practico de contenido, no como un dashboard complejo de marketing.

## Alcance MVP

### 1. Perfil de Contenido del Negocio

Cada negocio debe poder guardar:

- Nombre del negocio.
- Descripcion corta.
- Producto o servicio principal.
- Publico objetivo.
- Ciudad o mercado.
- Tono de comunicacion.
- Diferenciadores.
- Objeciones frecuentes de clientes.
- Preguntas frecuentes.
- Link principal o WhatsApp.
- Redes sociales donde publica.

### 2. Generador de Ideas

El sistema debe generar ideas a partir del perfil de contenido.

Cada idea debe incluir:

- Titulo.
- Objetivo: educar, vender, confianza, testimonio, objecion o promocion.
- Formato sugerido: reel, carrusel, story, post o short.
- Red recomendada.
- Hook inicial.
- Guion corto.
- Caption.
- CTA.
- Hashtags sugeridos.
- Nivel de esfuerzo: bajo, medio o alto.

### 3. Banco de Contenido

Crear una vista para guardar y administrar piezas de contenido.

Campos sugeridos:

- Titulo.
- Tipo de contenido.
- Estado: idea, en produccion, listo, publicado, reciclable o pausado.
- Categoria: evergreen, promocion, educativo, testimonio, producto u objecion.
- Red social.
- Guion.
- Caption.
- CTA.
- Fecha de creacion.
- Fecha sugerida de publicacion.
- Fecha real de publicacion.
- Archivo o enlace opcional.
- Notas.

### 4. Calendario Simple

Crear una vista semanal o mensual donde el operador pueda:

- Ver contenido programado.
- Cambiar fechas.
- Marcar como publicado.
- Duplicar una pieza.
- Crear variante.
- Ver estado del contenido.

No se incluye autopublicacion en esta fase.

### 5. Reciclaje Asistido

Agregar acciones para:

- Crear nueva variante de caption.
- Crear nuevo hook.
- Convertir una pieza a otro formato.
- Sugerir proxima fecha para republicar.
- Marcar contenido como evergreen.
- Pausar contenido que no funciono.

Reglas iniciales:

- Contenido evergreen puede repetirse cada 21 a 45 dias.
- Contenido promocional no debe repetirse demasiado seguido.
- Contenido con buen rendimiento debe sugerirse para reciclaje.
- Contenido con bajo rendimiento debe sugerir cambios antes de repetirse.

### 6. Registro Manual de Resultados

Permitir registrar resultados despues de publicar:

- Vistas.
- Likes.
- Comentarios.
- Compartidos.
- Guardados.
- Clics.
- Mensajes recibidos.
- Leads generados.
- Ventas atribuidas opcionalmente.

Metricas basicas:

- Engagement rate aproximado.
- Leads por publicacion.
- Mejores categorias.
- Mejores formatos.
- Mejores CTAs.

### 7. Recomendaciones

Crear una seccion simple de insights:

- Que contenido repetir.
- Que temas funcionan mejor.
- Que formato parece rendir mejor.
- Que CTA genera mas mensajes.
- Que ideas conviene producir esta semana.

## Uso de IA

La IA se usara inicialmente solo para texto:

- Generar ideas.
- Generar guiones.
- Generar captions.
- Reescribir hooks.
- Crear variantes.
- Adaptar una pieza a otra red social.

No incluir por ahora:

- Autopublicacion.
- Conexion OAuth con redes sociales.
- Generacion automatica de video.
- HeyGen.
- ElevenLabs.
- Metricas por API.

## Modelo de Datos Sugerido

### content_profiles

- id
- business_id
- business_name
- description
- primary_offer
- target_audience
- market
- tone
- differentiators
- common_objections
- faqs
- primary_link
- social_channels
- created_at
- updated_at

### content_items

- id
- business_id
- profile_id
- title
- objective
- format
- category
- status
- social_channel
- hook
- script
- caption
- cta
- hashtags
- effort_level
- source_content_id
- is_evergreen
- suggested_publish_at
- published_at
- next_recycle_at
- asset_url
- notes
- created_at
- updated_at

### content_metrics

- id
- content_item_id
- views
- likes
- comments
- shares
- saves
- clicks
- messages
- leads
- sales
- recorded_at
- created_at

## Pantallas Sugeridas

1. Content Profile.
2. Ideas Generator.
3. Content Library.
4. Content Calendar.
5. Content Performance.
6. Recommendations.

## Prioridad de Desarrollo

Este modulo no debe bloquear el MVP actual de paginas de producto.

Orden recomendado cuando el flujo de paginas este estable:

1. Modelo de datos.
2. Perfil de contenido.
3. CRUD de contenido.
4. Generador IA de ideas y captions.
5. Calendario simple.
6. Registro manual de metricas.
7. Recomendaciones basicas.
8. Reciclaje asistido.

## Criterios de Aceptacion

- Un negocio puede crear su perfil de contenido.
- El sistema puede generar al menos 10 ideas a partir del perfil.
- El usuario puede guardar ideas como piezas de contenido.
- El usuario puede editar guion, caption, hook y CTA.
- El usuario puede ver piezas en biblioteca y calendario.
- El usuario puede marcar una pieza como publicada.
- El usuario puede registrar metricas manualmente.
- El sistema recomienda que contenido reciclar.
- No se requiere conexion con redes sociales para esta version.

## Decision Operativa

PH-026 queda clasificado como modulo de crecimiento posterior al cierre del MVP operativo de paginas.

Antes de implementarlo deben cerrarse:

- Plantilla maestra `ganomaster.pro` confiable.
- Publicacion verificada PH-020.
- Edicion y republicacion de paginas cliente.
- Prueba 0 a 100 con `jairopinto.pro`.

