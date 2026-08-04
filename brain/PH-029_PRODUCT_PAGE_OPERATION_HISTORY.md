# PH-029: Historial operativo de generacion, publicacion y verificacion

## Estado

Implementado en backend MVP.

## Contexto

PartnerHub ya puede generar, publicar y verificar paginas de producto, pero el operador necesita una bitacora historica por sitio para saber que paso antes de entregar o volver a publicar una pagina.

El MVP no puede depender de memoria de chat, capturas, logs de EasyPanel o comprobaciones manuales sueltas.

## Problema que resuelve

Cuando una pagina falla por cache, SFTP, mantenimiento de hosting, ruta remota incorrecta o configuracion desactualizada, el dashboard solo muestra el estado actual. Falta una memoria operativa que permita responder:

- Cuando se genero el ultimo paquete.
- Cuando se publico por SFTP.
- Si la verificacion paso o fallo.
- Que checks fallaron.
- Que dominio y ruta remota se usaron.
- Cuantos archivos se publicaron.

## Decision MVP

Cada sitio de producto tendra una bitacora file-backed en:

`PRODUCT_PAGE_SOURCE_DIR/.history/{siteId}.json`

El historial guarda maximo 100 eventos recientes por sitio para evitar crecimiento indefinido.

## Eventos registrados

- `GENERATED`: el paquete estatico fue generado.
- `PUBLISHED`: los archivos fueron enviados por SFTP.
- `VERIFIED`: la pagina publica paso verificacion.
- `VERIFY_FAILED`: la pagina publica fallo verificacion.

## Contrato API

### Consultar historial de un sitio

`GET /api/internal/product-pages/{siteId}/history`

Respuesta:

```json
{
  "siteId": "dorian-higuita",
  "events": [
    {
      "id": "mf9a0s-generated",
      "siteId": "dorian-higuita",
      "type": "GENERATED",
      "occurredAt": "2026-08-04T00:00:00.000Z",
      "domain": "dorianhiguita.pro",
      "outputDirectory": "/data/generated-sites/dorian-higuita",
      "fileCount": 8,
      "message": "Product page package generated."
    }
  ]
}
```

### Listado general de paginas

`GET /api/internal/product-pages`

Ahora incluye:

- `lastVerification`
- `lastHistoryEvent`

## Integracion con servicios

- `productPageGenerationService.generate()` registra `GENERATED`.
- `productPagePublicationService.publish()` registra `PUBLISHED`.
- `productPageVerificationService.verify()` registra `VERIFIED` o `VERIFY_FAILED`.
- La replicacion desde Master Site queda cubierta porque usa los mismos servicios base.

## UI pendiente para Antigravity

Agregar en `/landing-builder` y `/master-site` un bloque "Historial operativo" por sitio con:

- Ultimos 5 eventos.
- Fecha/hora.
- Tipo de evento.
- Estado visual.
- Dominio.
- Ruta remota si aplica.
- Checks fallidos si aplica.

El objetivo es que el operador pueda entender que ocurrio sin entrar al VPS.

## Criterios de aceptacion

- Generar paquete agrega evento `GENERATED`.
- Publicar pagina agrega evento `PUBLISHED`.
- Verificar pagina agrega evento `VERIFIED` o `VERIFY_FAILED`.
- `GET /api/internal/product-pages/{siteId}/history` devuelve los eventos del sitio.
- `GET /api/internal/product-pages` devuelve el ultimo evento para uso rapido del dashboard.
- No se cambia el modelo Prisma ni se agrega dashboard para empresarios finales.

## Prioridad

Alta para cierre MVP y escalamiento operativo.

