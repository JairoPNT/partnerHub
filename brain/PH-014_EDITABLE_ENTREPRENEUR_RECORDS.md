# PH-014: Edicion administrativa de empresarios

## Objetivo

Permitir que el operador corrija o complete los datos de un empresario despues del registro, sin crear otro lead ni regenerar el sitio automaticamente.

## API

`PATCH /api/internal/activation-leads/:id`

Puede actualizar estado, nombre, WhatsApp, correo, marca, producto, metodo de pago, codigo de referido y los datos tecnicos de onboarding: pais, telefono, URL de compra, heroes, logo, favicon y Analytics.

Los consentimientos legales originales no se modifican desde este flujo.

## Campos editables despues de publicar

Una pagina de empresario publicada sigue siendo editable desde el dashboard administrativo. Se pueden corregir:

- Fotos hero desktop y mobile.
- WhatsApp de registro, telefono visible y mensaje inicial de WhatsApp.
- Correo electronico.
- Marca/nombre comercial y nombre completo.
- URL de compra o tienda externa.
- Titulo SEO y meta descripcion.
- Modo de logo, URL de logo, favicon opcional y Analytics GA4.
- Dominio de publicacion, solo como operacion administrativa consciente porque cambia el destino SFTP.

Despues de guardar cambios de contenido, el operador debe publicar nuevamente la pagina para que el sitio publico refleje el cambio.

El backend sincroniza los datos editados del empresario con la fuente JSON del sitio cuando existe un `siteId` vinculado.

Si la sincronizacion secundaria de la fuente JSON encuentra datos heredados invalidos, el guardado del empresario no debe fallar. La operacion administrativa debe persistir el cambio y la sincronizacion debe omitir URLs opcionales invalidas cuando sea posible.

Regla importante de precedencia:

- Cuando el cambio viene desde `/partners`, los datos del lead administrativo pueden sobrescribir la fuente JSON porque esa vista es la ficha operativa del empresario.
- Cuando el cambio viene desde `/landing-builder`, la fuente JSON editada de la landing tiene prioridad.
- `POST /api/internal/product-pages/publish` puede rellenar campos faltantes desde el lead vinculado, pero no debe sobrescribir valores ya presentes en la fuente JSON. Esto evita que una URL de compra, telefono, marca o hero corregidos en Landing Builder vuelvan a un dato anterior del lead durante la publicacion.

## Campos bloqueados

El `siteId` es un identificador tecnico permanente. Una vez vinculado a un empresario no se puede modificar desde la interfaz ni reemplazar por PATCH con un valor diferente. Cambiarlo implica crear una nueva pagina o hacer una migracion tecnica manual, porque afecta rutas locales, objetos R2, referencias de publicacion y registros de referidos.

## Flujo del sitio

1. Registrar al empresario como `PAID`.
2. Completar o corregir sus datos.
3. Generar la pagina usando el `siteId` elegido.
4. Vincular ese `siteId` al lead.
5. Publicar la pagina en el dominio correspondiente.
6. Si se editan datos despues de publicar, guardar cambios y volver a publicar; la regeneracion previa se ejecuta automaticamente.

