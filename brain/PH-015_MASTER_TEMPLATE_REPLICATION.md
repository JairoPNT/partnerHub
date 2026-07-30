# PH-015: Plantilla maestra y replicacion controlada

## Decision MVP

La plantilla maestra sigue siendo el contenido versionado en GitHub dentro de `plantillas-de-pagina/producto`. `ganomaster.pro` funcionara como sitio de referencia y vista previa publicada; no sera el editor tecnico directo del servidor.

Esto permite revisar visualmente una version antes de replicarla y conserva historial de cambios mediante Pull Requests.

## Publication targets

La publicacion SFTP mantiene compatibilidad con `HOSTINGER_SFTP_REMOTE_ROOT`, pero admite destinos por sitio mediante la variable segura:

`HOSTINGER_SFTP_REMOTE_ROOTS_JSON`

Ejemplo conceptual:

```json
{
  "ganomaster": "/home/usuario/domains/ganomaster.pro/public_html",
  "jairo-pinto-test": "/home/usuario/domains/jairopinto.pro/public_html"
}
```

No se deben inventar rutas: cada ruta debe confirmarse en Hostinger por SSH.

Para escalar nuevos dominios del mismo plan Hostinger se recomienda configurar una sola vez:

`HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE=/home/u658137804/domains/{domain}/public_html`

La configuracion guardada de cada sitio debe incluir `site.domain`. El sistema sustituye `{domain}` automaticamente y la lista JSON queda solo como compatibilidad para sitios antiguos o excepciones.

## Replication API

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
4. Generar y revisar `ganomaster.pro`.
5. Usar replicacion selectiva para una pagina de prueba.
6. Verificar el dominio publicado.
7. Ejecutar replicacion general solo despues de aprobar la prueba.
