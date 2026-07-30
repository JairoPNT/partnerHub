# PH-022: Plantilla maestra ganomaster.pro

## Contexto

`ganomaster.pro` debe convertirse en la plantilla maestra efectiva para las paginas de producto. Las correcciones hechas manualmente en una pagina cliente, como `dorianhiguita.pro`, no escalan si no regresan a la fuente maestra.

## Decision operativa

La fuente estructural del sistema queda definida asi:

1. `plantillas-de-pagina/producto` es la plantilla canonica versionada en Git.
2. `/master-site` genera y publica `ganomaster.pro` usando esa plantilla canonica.
3. Los sitios cliente se generan tomando como base el paquete publicado/generado de `ganomaster`.
4. Ningun cliente debe ser considerado entregable si `ganomaster.pro` no fue revisado, publicado y verificado primero.

## Reglas MVP

- Cambios estructurales de HTML, CSS y JS se hacen en `plantillas-de-pagina/producto`.
- Cambios de datos del empresario se hacen en `/partners` o `/landing-builder`.
- `ganomaster.pro` no es cliente; es vista previa maestra aprobable por el equipo.
- `jairo-pinto-test` debe quedar fuera del flujo operativo. `jairopinto.pro` se tratara como cliente real cuando se haga la prueba 0 a 100.
- Antes de replicar, el operador debe abrir `ganomaster.pro`, revisar visualmente y aprobar desde `/master-site`.

## Criterios minimos de plantilla replicable

- No contiene datos de `jenny-varela`.
- No contiene datos de `jairo-pinto-test`.
- No contiene `https://colombia.ganoexcel.com/GanoMaster`.
- No contiene enlaces `href="#comprar"` en botones de compra.
- Los botones `.product-btn-buy` son llenados por `initPurchaseLinks()` desde `CONFIG.distributor.purchaseUrl`.
- Si `purchaseUrl` no existe, los botones de compra quedan deshabilitados.
- `app.js` publicado no contiene URLs de compra heredadas.
- `config.js` publicado refleja `site.id`, `site.domain`, marca, telefono, WhatsApp, heroes y URL de compra esperados.

## Flujo correcto

1. Editar estructura de pagina en `plantillas-de-pagina/producto`.
2. Subir cambios por Git y desplegar `app.partnerhub.club`.
3. Entrar a `/master-site`.
4. Configurar/confirmar datos de `ganomaster`.
5. Generar vista previa.
6. Publicar en `ganomaster.pro`.
7. Verificar `ganomaster.pro` con PH-020.
8. Aprobar visualmente.
9. Replicar a clientes seleccionados.

## Proxima prueba prioritaria

Ejecutar `jairopinto.pro` de 0 a 100 como cliente real:

- Registro / lead.
- Vinculacion de `siteId`.
- Dominio de publicacion.
- Heroes.
- URL de compra.
- Analytics.
- Generacion.
- Publicacion.
- Verificacion.
- Entrega.
