# PH-015: Plantilla maestra y replicacion controlada

## Decision MVP

La plantilla maestra se inicializa desde el contenido versionado en GitHub dentro de `plantillas-de-pagina/producto` y, una vez publicada, el paquete de `ganomaster.pro` se convierte en la fuente operativa para construir nuevas páginas de clientes. `ganomaster.pro` funciona como sitio de referencia y vista previa publicada; no es el editor técnico directo del servidor.

El `siteId` reservado para el master es `ganomaster` y su dominio es `ganomaster.pro`. La replicacion general excluye este sitio para evitar sobrescribir la referencia maestra.

Esto permite revisar visualmente una version antes de replicarla y conserva historial de cambios mediante Pull Requests.

## Publication targets

La publicacion SFTP mantiene compatibilidad con `HOSTINGER_SFTP_REMOTE_ROOT`, pero admite destinos por sitio mediante la variable segura:

`HOSTINGER_SFTP_REMOTE_ROOTS_JSON`

Ejemplo conceptual:

```json
{
  "ganomaster": "/home/usuario/domains/ganomaster.pro/public_html",
  "jairopinto": "/home/usuario/domains/jairopinto.pro/public_html"
}
```

No se deben inventar rutas: cada ruta debe confirmarse en Hostinger por SSH.

Para escalar nuevos dominios del mismo plan Hostinger se recomienda configurar una sola vez:

`HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE=/home/u658137804/domains/{domain}/public_html`

La configuracion guardada de cada sitio debe incluir `site.domain`. El sistema sustituye `{domain}` automaticamente y la lista JSON queda solo como compatibilidad para sitios antiguos o excepciones.

## Replication API

Antes de replicar existe un paso separado para actualizar la vista maestra:

`POST /api/internal/product-pages/master/preview`

Este endpoint regenera y publica exclusivamente `ganomaster.pro`. El equipo puede revisar esa URL sin afectar las paginas de clientes.

`POST /api/internal/product-pages/replicate`

Body obligatorio:

```json
{
  "confirmation": "REPLICATE_TEMPLATE"
}
```

Opcionalmente puede recibir `siteIds` para publicar solo un subconjunto. El proceso regenera cada sitio desde su configuracion guardada usando la plantilla actual y publica cada paquete en su destino configurado.

La interfaz debe mostrar alcance, sitios afectados y pedir confirmacion antes de ejecutar. No debe existir un deploy general silencioso.

## Flujo operativo

1. Modificar plantilla en GitHub.
2. Abrir Pull Request y fusionar a `main`.
3. Desplegar el backend/plantilla en EasyPanel.
4. Ejecutar el preview de `ganomaster.pro`.
5. Revisar la pagina con el equipo.
6. Usar replicacion selectiva para una pagina de prueba.
7. Verificar el dominio publicado.
8. Ejecutar replicacion general solo despues de aprobar la prueba.

Editar directamente el `public_html` de `ganomaster.pro` no actualiza GitHub ni convierte esos cambios en plantilla. Los nuevos clientes se generan a partir del paquete publicado del master y reciben encima su `config.js` particular. Si se modifica la estructura HTML/CSS/JS, el cambio debe entrar por GitHub, publicarse primero en el master y luego replicarse.

## Client conversion links

La URL de compra de cada empresario vive en `distributor.purchaseUrl` dentro del `config.js` generado. Los botones `Comprar` de la plantilla no deben tener una tienda fija quemada en HTML; al cargar la pagina, `app.js` asigna esa URL a todos los enlaces `.product-btn-buy`.

Si un empresario cambia su tienda o checkout externo, se actualiza el campo `URL de Compra / Pasarela` en `/partners` o `/landing-builder`, se regenera el paquete y se publica de nuevo el sitio. No se debe editar manualmente cada boton del catalogo.
