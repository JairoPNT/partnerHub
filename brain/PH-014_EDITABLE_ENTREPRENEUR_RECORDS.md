# PH-014: Edicion administrativa de empresarios

## Objetivo

Permitir que el operador corrija o complete los datos de un empresario despues del registro, sin crear otro lead ni regenerar el sitio automaticamente.

## API

`PATCH /api/internal/activation-leads/:id`

Puede actualizar estado, nombre, WhatsApp, correo, marca, producto, metodo de pago, codigo de referido y los datos tecnicos de onboarding: pais, telefono, URL de compra, heroes, logo, favicon y Analytics.

Los consentimientos legales originales no se modifican desde este flujo.

## Flujo del sitio

1. Registrar al empresario como `PAID`.
2. Completar o corregir sus datos.
3. Generar la pagina usando el `siteId` elegido.
4. Vincular ese `siteId` al lead.
5. Publicar la pagina en el dominio correspondiente.

