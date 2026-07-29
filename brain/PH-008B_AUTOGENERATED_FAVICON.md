# PH-008B: Favicon automatico en onboarding

## Decision

El onboarding publico no debe solicitar una URL de favicon. La mayoria de empresarios no dispone de un archivo ICO o PNG y este dato no es necesario para iniciar la solicitud.

## Behavior

- `faviconUrl` deja de mostrarse y solicitarse en el formulario publico.
- El dato puede permanecer opcional en el contrato interno para permitir una carga posterior desde el dashboard.
- Durante la generacion de la pagina, si existe `faviconUrl`, se usa ese recurso.
- Si no existe, el generador crea un favicon de respaldo usando la primera inicial de `brandName`; si no existe, usa la primera inicial de `fullName`.
- La inicial debe normalizarse a mayuscula, conservar una apariencia legible y usar el color de marca/base de la plantilla.
- La salida generada debe incluir el favicon y sus referencias HTML sin depender de una URL externa.

## Handoff to Antigravity

- Remover el campo `faviconUrl` de la vista publica `/onboarding/[token]`.
- No cambiar el resto del contrato PATCH; `faviconUrl` sigue siendo opcional para futuras herramientas internas.
- Mostrar en el dashboard administrativo una opcion posterior para reemplazar el favicon automatico por PNG/ICO cuando el operador lo requiera.
- En el formulario de onboarding, separar la seccion que actualmente mezcla "Medicion y acuerdos":
  - Seccion independiente titulada `Analytics`, con el `analyticsMeasurementId` como dato opcional.
  - Seccion independiente titulada `Acuerdos`, con `imageUseConsent` y `agreementAccepted`.
- No presentar Analytics como parte de la aceptacion legal ni presentar los acuerdos como una configuracion tecnica.

## Acceptance criteria

1. Un usuario puede completar el onboarding sin proporcionar favicon.
2. Una pagina generada sin favicon personalizado muestra el favicon automatico.
3. Una pagina generada con favicon personalizado conserva ese recurso.
4. El favicon no bloquea ni invalida el guardado parcial.
5. Analytics y Acuerdos aparecen como secciones visuales y conceptuales separadas.
