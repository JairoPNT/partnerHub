# CDX-20260820-008 — Runtime compatibility for CDX-006

## Incidente

En el runtime desplegado el comando existe bajo `/app`, pero `/app/plantillas-de-pagina/personal-brand/config.js` no fue empaquetado.

## Objetivo

Transportar únicamente el `config.js` canónico de Personal Brand como artefacto runtime y resolverlo por una ruta explícita, preservando todas las garantías DRY_RUN de CDX-006.

## Límites

Sin APPLY, fuentes productivas, PublishingTargets, DNS, Hostinger, publicación, regeneración, UI ni otros módulos.
