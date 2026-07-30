# PH-013: Registro interno de empresario pagado

## Purpose

Permitir que el operador registre clientes que ya pagaron sin obligarlos a repetir la oferta publica.

## API

`POST /api/internal/activation-leads`

Acepta los datos esenciales del empresario y, opcionalmente:

- `status`: por defecto `NEW`; para clientes ya pagados usar `PAID`.
- `siteId`: slug del sitio si ya fue definido.
- `onboardingData`: datos conocidos por el operador.

La respuesta incluye el lead, `onboardingToken` y `onboardingPath` para enviar el formulario temporal.

## Safety

- El endpoint es interno y queda detrás del acceso administrativo existente.
- El consentimiento legal sigue siendo obligatorio en el contrato (`termsAccepted: true`).
- Si hay `referrerCode` y `siteId`, se crea el referido manual correspondiente.
- El cliente no recibe acceso a `/partners`; solo recibe el enlace temporal de onboarding.

## UI handoff

Agregar en Operacion de Empresarios un boton `Registrar empresario pagado` con formulario y confirmacion. El formulario debe permitir iniciar directamente en `PAID` y mostrar el enlace de onboarding generado al finalizar.
