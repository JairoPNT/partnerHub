# PH-023 - Vista Previa Temporal de Paginas de Producto

## Estado

Implementado en MVP.

## Problema

El flujo de `landing-builder` tenia tres acciones con limites poco claros:

- `Generar paquete de producto`
- `Verificar ahora`
- `Publicar pagina`

La generacion crea archivos locales en el contenedor, pero el operador no tenia una URL temporal clara para revisar el resultado antes de subirlo al dominio final de Hostinger.

## Decision Operativa

El MVP debe separar tres etapas:

1. **Generar paquete de producto**
   - Construye los archivos estaticos del sitio en `/data/generated-sites/{siteId}`.
   - Guarda la fuente de configuracion en `/data/generated-sites/.sources/{siteId}.json`.
   - No modifica el dominio publico.
   - Debe exponer una URL interna de preview para revision administrativa.

2. **Vista previa temporal**
   - Sirve el paquete generado desde `app.partnerhub.club`.
   - Ruta interna: `/api/internal/product-pages/preview/{siteId}/`.
   - No es la pagina final del cliente.
   - No reemplaza la verificacion publica.
   - Debe usarse para detectar errores antes de publicar.

3. **Publicar pagina**
   - Sube el paquete generado por SFTP al dominio configurado del empresario.
   - Reemplaza archivos en `/home/u658137804/domains/{domain}/public_html`.
   - Despues de publicar, ejecuta verificacion contra el dominio publico.

4. **Verificar ahora**
   - Verifica solamente la version ya publicada en produccion.
   - Consulta `https://{domain}/`, `https://{domain}/config.js` y `https://{domain}/app.js`.
   - No debe modificar la fuente de configuracion guardada.
   - No es una vista previa.

## Reglas

- La URL de compra esperada debe salir exclusivamente del campo manual `purchaseUrl`.
- El sistema no debe inferir ni reemplazar `col.ganoexcel.com` por `colombia.ganoexcel.com`.
- Los ejemplos del dashboard deben usar datos genericos (`John Smith`, `john-smith`, `johnsmith.pro`) y no nombres de clientes reales.
- La vista previa temporal debe tener `Cache-Control: no-store`.
- La verificacion debe ser de solo lectura. No debe re-sincronizar ni sobreescribir la fuente guardada del sitio durante la auditoria.
- La URL de vista previa temporal debe construirse con un origin publico de administracion; nunca debe exponer hosts internos como `0.0.0.0:80`.
- El boton de vista previa debe derivar la ruta desde `siteId` para evitar URLs persistidas o respuestas antiguas con hosts internos.
- Al generar el paquete, la interfaz debe llevar al operador al bloque de resultado/preview, no al inicio de la pantalla.

## Estado UI Inicial

- Renombrar visualmente las acciones para que el operador entienda el flujo:
  - `Generar paquete de producto` -> `Generar vista previa`
  - `Abrir vista previa` -> abre el paquete temporal
  - `Publicar pagina` -> despliega en el dominio final
  - `Verificar ahora` -> audita produccion publicada
