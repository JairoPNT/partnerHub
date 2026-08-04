# PH-028 - Automatizacion futura de Google Analytics 4

## Estado

Backlog futuro. No bloquea el MVP comercial.

## Contexto

Durante el MVP, PartnerHub ya puede operar Analytics de forma manual:

1. El operador crea la propiedad GA4 en la cuenta `PartnerHub`.
2. El operador crea el flujo web del dominio del empresario.
3. El operador copia el `Measurement ID` con formato `G-XXXXXXXXXX`.
4. El operador lo guarda en PartnerHub desde `/analytics`.
5. El sitio se regenera y publica desde `/landing-builder`.
6. Se verifica trafico en GA4 en tiempo real.

Este flujo fue validado manualmente con sitios reales, incluyendo `claudia-calero`, `blanca-ruiz`, `dorian-higuita` y `jairo-pinto`.

## Objetivo futuro

Permitir que PartnerHub cree y configure automaticamente propiedades y flujos web de Google Analytics 4 para cada empresario, reduciendo pasos manuales y errores operativos.

## Alcance propuesto

El modulo `/analytics` deberia permitir:

- Crear propiedad GA4 desde PartnerHub.
- Crear flujo web usando el dominio registrado del empresario.
- Guardar automaticamente el `measurementId` devuelto por Google.
- Marcar el checklist operativo como completado hasta el paso de instalacion.
- Regenerar y publicar la pagina con la etiqueta incluida.
- Verificar manualmente o automaticamente que la pagina contiene el ID correcto.

## Fuera de alcance para MVP

No se automatiza aun:

- Lectura de reportes GA4 dentro de PartnerHub.
- ROI / ROAS.
- Meta Pixel.
- Google Ads Conversion Tracking.
- Acceso del empresario a un dashboard propio.
- Creacion de cuentas de Google por empresario.

## Requisitos tecnicos

Antes de implementar este ticket se debe decidir:

- Si se usara OAuth con la cuenta administradora de Jairo / PartnerHub.
- Si se usara service account con permisos sobre la cuenta GA4.
- Donde se almacenaran credenciales de Google de forma segura.
- Que permisos minimos necesita PartnerHub para crear propiedades y flujos.
- Como se audita quien creo o modifico una configuracion de analytics.

## Variables o secretos esperados

No definir valores reales en Git.

Posibles variables:

```env
GOOGLE_ANALYTICS_ACCOUNT_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

La decision final depende del mecanismo de autenticacion escogido.

## Flujo operativo esperado

1. Operador entra a `/analytics`.
2. Selecciona empresario.
3. Clic en `Crear GA4 automaticamente`.
4. PartnerHub crea propiedad y flujo web.
5. PartnerHub guarda `integrations.analytics.measurementId`.
6. Operador genera/publica pagina.
7. PartnerHub verifica que `config.js` contiene el ID.
8. Operador valida trafico real en GA4.

## Riesgos

- Google puede requerir consentimientos OAuth y permisos elevados.
- Las APIs pueden tener limites, cambios de permisos o requisitos de verificacion.
- Un error podria crear propiedades duplicadas.
- Si la cuenta de Google queda bloqueada o cambia permisos, se detiene la automatizacion.

## Decision MVP

Para vender y operar ahora, el proceso manual validado es suficiente.

PH-028 queda como mejora de escalabilidad, no como prerequisito para entregar paginas.

