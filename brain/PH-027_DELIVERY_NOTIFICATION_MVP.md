# PH-027 - Entrega Administrativa del Sitio al Empresario

## Objetivo

Agregar al dashboard administrativo un flujo simple para notificar al empresario cuando su sitio web ya esta publicado y verificado.

El MVP no incluye dashboard para usuarios finales. La entrega se hace desde el panel interno de PartnerHub, por correo y/o WhatsApp.

## Alcance MVP

- Ubicacion: `app.partnerhub.club/partners`.
- Entrada operativa: modal de detalle del empresario.
- Acciones disponibles:
  - Preparar mensaje de entrega.
  - Copiar mensaje de WhatsApp.
  - Copiar cuerpo de correo.
  - Abrir WhatsApp con mensaje prellenado.
  - Abrir cliente de correo con asunto y cuerpo prellenado.
  - Enviar correo automaticamente si SMTP esta configurado.

## Endpoint Interno

```http
POST /api/internal/activation-leads/:id/delivery
Content-Type: application/json

{
  "sendEmail": true
}
```

Si `sendEmail` es `false`, el endpoint solo prepara los textos y URLs de accion.

## Datos Usados

La entrega se construye con los datos del lead y su onboarding:

- Nombre completo.
- Marca visible.
- Dominio publicado.
- WhatsApp visible.
- Telefono visible.
- URL de compra.
- ID de Analytics GA4.
- Correo del empresario, si existe.

## Variables de Entorno SMTP

Estas variables se configuran en EasyPanel, dentro del servicio `partnerhub`, seccion `Entorno`.

No deben guardarse en Git.

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contacto@partnerhub.club
SMTP_PASSWORD=CONTRASENA_REAL_DEL_BUZON
SMTP_FROM=PartnerHub <contacto@partnerhub.club>
PARTNERHUB_SUPPORT_EMAIL=soporte@partnerhub.club
PARTNERHUB_SUPPORT_WHATSAPP=573188430283
```

Notas:

- `SMTP_PASSWORD` va sin corchetes.
- Si se usa puerto `465`, `SMTP_SECURE=true`.
- Si se usa puerto `587`, normalmente `SMTP_SECURE=false`.
- Despues de guardar variables en EasyPanel, se debe implementar/reiniciar el servicio.

## Estados de Envio

- `NOT_REQUESTED`: se preparo el mensaje, pero no se intento enviar correo.
- `NO_EMAIL`: el empresario no tiene correo registrado.
- `SMTP_NOT_CONFIGURED`: faltan variables SMTP en el servidor.
- `SENT`: el correo fue enviado.
- `FAILED`: se intento enviar, pero el proveedor SMTP rechazo o fallo la solicitud.

## Regla Operativa

Antes de enviar la entrega, el operador debe verificar:

- El sitio publica correctamente.
- El boton de WhatsApp apunta al numero correcto.
- El boton de compra apunta a la URL entregada por el empresario.
- Las imagenes hero cargan desde R2.
- El dominio esta en estado publicado/verificado.

## Pendiente Posterior

- Registrar historial de entregas enviadas por lead.
- Agregar plantilla editable de correo desde Settings.
- Permitir reenvio de entrega con version de sitio y fecha.
- Conectar envio transaccional dedicado si Hostinger limita SMTP.
