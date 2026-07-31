# PH-020: Publicacion verificada

## Contexto

Durante la entrega urgente de `dorianhiguita.pro`, PartnerHub genero y publico archivos que aparentemente eran correctos desde el dashboard, pero la pagina publica no reflejo el enlace real de compra configurado en `distributor.purchaseUrl`.

El problema obligo a una correccion manual del `index.html`, escribiendo directamente:

`https://col.ganoexcel.com/dorianwellness`

Ese tipo de correccion manual puede resolver una entrega puntual, pero no escala para 50, 100 o 200 paginas. El sistema no debe confiar solo en que el SFTP respondio correctamente; debe verificar que el dominio publico este sirviendo los datos esperados.

## Problema que resuelve

La publicacion actual puede terminar en un estado ambiguo:

- El dashboard muestra una operacion exitosa.
- Los archivos parecen haber sido generados.
- El SFTP puede no sobrescribir lo esperado, servir contenido anterior o quedar afectado por cache / mantenimiento / ruta incorrecta.
- La pagina publica puede conservar enlaces antiguos, `href="#comprar"` o datos de otro empresario.

Esto crea riesgo operativo, legal y comercial porque el empresario puede recibir una pagina entregada con:

- URL de compra incorrecta.
- WhatsApp incorrecto.
- Nombre / marca incorrectos.
- Heroes antiguos.
- `config.js` correcto pero HTML o JS desactualizados.

## Decision MVP

Toda publicacion de una pagina de producto debe tener dos fases:

1. `PUBLISHED`: los archivos fueron enviados al destino remoto.
2. `VERIFIED`: el dominio publico fue consultado y contiene los datos esperados.

Un sitio no debe considerarse listo para entrega hasta llegar a `VERIFIED`.

Si la verificacion falla, el dashboard debe mostrar un estado visible:

`PUBLICADO, PERO NO VERIFICADO`

El operador debe ver el motivo del fallo y no depender de revisar manualmente cada enlace.

## Alcance MVP

PH-020 valida paginas estaticas publicadas en Hostinger mediante SFTP.

No intenta resolver aun:

- Monitoreo continuo.
- Auditoria legal completa.
- Pruebas visuales con screenshots.
- Comparacion pixel a pixel.
- Dashboard para empresarios finales.
- Webhooks automaticos de Hostinger.

## Datos minimos a verificar

Despues de publicar, PartnerHub debe consultar:

- `https://{domain}/`
- `https://{domain}/config.js`
- `https://{domain}/app.js`

La verificacion minima debe confirmar:

- `site.id` esperado.
- `site.domain` esperado.
- `distributor.brandName` esperado.
- `distributor.fullName` esperado.
- `distributor.whatsappNumber` esperado.
- `distributor.purchaseUrl` esperado.
- ausencia de `href="#comprar"` en `index.html`.
- presencia de `.product-btn-buy` en la plantilla.
- presencia de `config.js` y `app.js` en el HTML publicado.
- presencia del manejador dinamico `initPurchaseLinks` en `app.js`.
- ausencia de URLs heredadas de prueba como `colombia.ganoexcel.com` en `app.js`.

Para assets visuales:

- `hero.desktop` esperado en `config.js`.
- `hero.mobile` esperado en `config.js`.

PH-019 ya define que los heroes deben usar archivos versionados en R2 para evitar cache resistente.

## Estados propuestos

`NOT_STARTED`

La pagina no ha sido generada.

`GENERATED`

El paquete local fue generado.

`PUBLISHED`

Los archivos fueron enviados por SFTP.

`VERIFIED`

El dominio publico devuelve los datos esperados.

`VERIFY_FAILED`

La publicacion se ejecuto, pero el dominio publico no coincide con la configuracion esperada.

## Contrato de API propuesto

### Verificar una pagina publicada

`POST /api/internal/product-pages/verify`

Body:

```json
{
  "siteId": "dorian-higuita"
}
```

Respuesta exitosa:

```json
{
  "siteId": "dorian-higuita",
  "domain": "dorianhiguita.pro",
  "verifiedAt": "2026-07-30T00:00:00.000Z",
  "status": "VERIFIED",
  "checks": [
    { "name": "homepage_reachable", "status": "PASS" },
    { "name": "config_reachable", "status": "PASS" },
    { "name": "purchase_url_matches", "status": "PASS" },
    { "name": "no_static_comprar_fallback", "status": "PASS" }
  ]
}
```

Respuesta con fallo:

```json
{
  "siteId": "dorian-higuita",
  "domain": "dorianhiguita.pro",
  "verifiedAt": "2026-07-30T00:00:00.000Z",
  "status": "VERIFY_FAILED",
  "checks": [
    { "name": "homepage_reachable", "status": "PASS" },
    {
      "name": "purchase_url_matches",
      "status": "FAIL",
      "expected": "https://col.ganoexcel.com/dorianwellness",
      "actual": "https://dorianhiguita.pro/#comprar"
    }
  ]
}
```

## Integracion con publicacion

`POST /api/internal/product-pages/publish`

Despues de subir archivos por SFTP, debe ejecutar automaticamente la verificacion minima.

La respuesta de publicacion debe incluir:

- `publishedAt`
- `verifiedAt`
- `publicationState`
- `verificationStatus`
- `checks`

Si el SFTP fue exitoso pero la verificacion fallo, la respuesta HTTP puede seguir siendo 201 solo si el frontend muestra claramente que no esta listo para entregar.

Para MVP se recomienda que el dashboard use un estado visual fuerte:

- Verde: publicado y verificado.
- Amarillo: publicado pero pendiente de verificacion.
- Rojo: verificacion fallida.

## Dashboard administrativo

En `/landing-builder`, `/partners` y `/master-site`, cada sitio debe mostrar:

- Ultima fecha de generacion.
- Ultima fecha de publicacion.
- Ultima fecha de verificacion.
- Estado de verificacion.
- Boton `Verificar ahora`.
- Detalle de checks fallidos.

El boton `Publicar pagina` debe cambiar su lenguaje:

- Durante SFTP: `Publicando...`
- Durante validacion: `Verificando dominio...`
- Exito: `Publicado y verificado`
- Fallo: `Publicado, pero requiere revision`

## Criterios de aceptacion

- Al publicar una pagina, el sistema consulta el dominio publico y `config.js`.
- Si `purchaseUrl` publico no coincide con el valor guardado, la pagina queda en `VERIFY_FAILED`.
- Si `index.html` contiene `href="#comprar"`, la pagina queda en `VERIFY_FAILED`.
- Si el dominio no responde, la pagina queda en `VERIFY_FAILED`.
- Si `config.js` no responde, la pagina queda en `VERIFY_FAILED`.
- Si todo coincide, la pagina queda en `VERIFIED`.
- El operador puede ejecutar `Verificar ahora` sin volver a publicar.
- La verificacion queda registrada para auditoria operativa.

## Reglas operativas

- No se debe entregar una pagina a un empresario si esta en `VERIFY_FAILED`.
- Una publicacion manual de emergencia debe quedar registrada como incidencia.
- Si se corrige manualmente un sitio, el cambio debe volver a la plantilla o al generador para no repetirlo.
- Los cambios estructurales se corrigen en `plantillas-de-pagina/producto`.
- Los cambios de datos del empresario se corrigen en `/partners` o `/landing-builder`.

## Relacion con otros tickets

- PH-015: define plantilla maestra y replicacion controlada.
- PH-018: define destinos dinamicos de Hostinger por dominio.
- PH-019: define carga automatica de heroes a R2 con URLs versionadas.
- PH-020: valida que lo publicado realmente aparece en el dominio publico.

## Prioridad

Alta para MVP operativo.

Este ticket debe ejecutarse antes de escalar la publicacion a multiples empresarios activos.

## Implementacion Codex 2026-07-30

Estado: ejecutado en backend MVP.

Cambios realizados:

- Se agrego `productPageVerificationService` para consultar `https://{domain}/` y `https://{domain}/config.js`.
- Se agrego `POST /api/internal/product-pages/verify` para ejecutar verificacion manual sin republicar.
- `POST /api/internal/product-pages/publish` ahora ejecuta verificacion automaticamente despues del SFTP.
- `POST /api/internal/product-pages/publish` regenera el paquete desde la fuente guardada antes de subirlo, para que cambios recientes de `/partners` no dependan de archivos estaticos anteriores.
- `POST /api/internal/product-pages/verify` sincroniza primero el lead vinculado con la fuente de pagina antes de comparar `expected` vs `actual`.
- La respuesta de publicacion incluye `publishedAt`, `verifiedAt`, `publicationState`, `verificationStatus` y `checks`.
- `publicationState` file-backed ahora acepta `VERIFIED` y `VERIFY_FAILED`.
- La ultima verificacion se guarda en `PRODUCT_PAGE_SOURCE_DIR/.verifications/<siteId>.json`.
- `GET /api/internal/product-pages` incluye `lastVerification` para consumo futuro del dashboard.
- La plantilla base ya no define una `purchaseUrl` de prueba. Si el operador no configura `URL de Compra / Pasarela`, los botones de compra quedan deshabilitados en vez de apuntar a una URL heredada.
- La verificacion tambien consulta `app.js` y falla si el sitio publicado conserva una version antigua sin enlaces de compra dinamicos o con URLs heredadas de prueba.

## Ajuste Codex 2026-07-31: Cache busting obligatorio

Contexto:

- `ganomaster.pro/config.js` podia contener la configuracion correcta, pero la pagina publica seguia renderizando recursos anteriores por cache de Hostinger/CDN.
- El HTML base cargaba `config.js`, `styles.css` y `app.js` sin version, permitiendo que navegadores, CDN o capa de hosting conservaran archivos antiguos.

Decision:

- Cada paquete generado debe versionar sus recursos criticos en el HTML publicado:
  - `config.js?v={assetVersion}`
  - `styles.css?v={assetVersion}`
  - `app.js?v={assetVersion}`
- La plantilla incluye `.htaccess` para pedir no-cache/must-revalidate sobre `index.html`, `config.js`, `app.js`, `styles.css` y `manifest.json`.
- La verificacion publica acepta referencias versionadas y sigue consultando con cache buster.

Criterio operativo:

- Si una publicacion no refleja cambios visibles, el primer diagnostico debe validar el `index.html` publico y confirmar que los tres recursos criticos tienen `?v=...`.
- No se debe volver a corregir manualmente una pagina cliente por cache sin antes regenerar y republicar desde PartnerHub.

Checks implementados:

- `homepage_reachable`
- `config_reachable`
- `config_parseable`
- `site_id_matches`
- `site_domain_matches`
- `brand_name_matches`
- `full_name_matches`
- `whatsapp_number_matches`
- `purchase_url_matches`
- `hero_desktop_matches`
- `hero_mobile_matches`
- `no_static_comprar_fallback`
- `product_buy_button_present`
- `config_script_present`
- `app_script_present`
- `app_js_reachable`
- `app_uses_dynamic_purchase_links`
- `app_has_no_legacy_purchase_url`

Notas:

- No se modifico UI por limite de rol; el cableado visual queda para Antigravity.
- No se crearon migraciones ni cambios Prisma; el MVP actual persiste auditoria operacional en JSON, consistente con los servicios de paginas existentes.
- `npm run lint` global sigue fallando por deuda previa en frontend no relacionada. `npx tsc --noEmit` y ESLint dirigido a los archivos backend de PH-020 pasaron correctamente.

## Ajuste Codex 2026-07-31: Precedencia de Landing Builder en publicacion

Contexto:

- Un empresario podia tener la URL correcta en Landing Builder, pero al publicar se ejecutaba una sincronizacion previa desde el lead administrativo.
- Si el lead conservaba una URL de compra antigua, esa sincronizacion podia pisar la fuente JSON guardada antes de regenerar y subir el sitio.

Decision:

- La publicacion puede sincronizar datos del lead solo como respaldo para campos faltantes.
- Los valores ya guardados en la fuente de la landing tienen prioridad durante `POST /api/internal/product-pages/publish`.
- La URL `https://colombia.ganoexcel.com/...` queda bloqueada en el esquema de generacion porque no corresponde al formato operativo aprobado.

Criterio operativo:

- Cambios de plantilla estructural: `/master-site` y luego replicacion aprobada.
- Cambios de datos de un empresario: `/landing-builder`, generar paquete y publicar.
- Aunque el dato viva principalmente en `config.js`, se sigue subiendo `index.html` para renovar los `?v=` de `config.js`, `styles.css` y `app.js` y romper cache resistente.
