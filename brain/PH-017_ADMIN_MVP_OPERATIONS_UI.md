# PH-017: Cierre de interfaz operativa del MVP

## Alcance de esta sesion

Exponer en el dashboard las capacidades que ya existen en backend, sin incluir todavia el caso operativo de Dorian.

## Entregables de interfaz

- Modal de empresarios con edicion de datos base y onboarding.
- Navegacion lateral priorizada por uso operativo: Core, Operations y Growth al final.
- Accion `Registrar empresario pagado` conectada a `POST /api/internal/activation-leads`.
- Mostrar y copiar el enlace temporal de onboarding.
- Seccion `Plantilla maestra y replicacion`.
- Vista de sitios guardados desde `GET /api/internal/product-pages`.
- Vista previa de `ganomaster.pro` como referencia visual.
- Replicacion selectiva o general mediante `POST /api/internal/product-pages/replicate`.
- Confirmacion explicita antes de publicar.
- Resultado por sitio: generado, publicado o error.
- Eliminar el boton y cualquier flujo visible de datos de prueba de Jenny Varela.

## Fuera de alcance

- Alta o dashboard para empresarios finales.
- Configuracion automatica de rutas SFTP sin confirmar primero las rutas reales de Hostinger.
- Publicacion o migracion de Dorian; se ejecuta en la siguiente sesion.
- Rediseño general de colores.

## Criterio de cierre

Un operador puede editar un lead, registrar un lead pagado, copiar su onboarding y ejecutar una replicacion seleccionando sitios, sin tocar directamente el servidor.
