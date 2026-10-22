# AGR-20261021-001 - Plantilla Business segura para tráfico pagado - Done

## Status

Completed.

## Summary

- Se actualizó la plantilla canónica `plantillas-de-pagina/business/` partiendo limpiamente desde `origin/main` sin fusionar el personalizador de estilos (`53a1c65`) ni codificar identidad personal de Claudia Calero en el master compartido (`config.js` e `index.html` conservan identidad vacía/derivada del partner).
- Se implementó la lectura y validación estricta de `window.CONFIG.businessLandingContent` conforme al contrato integrado en PR #226 (`hero.headline`, `hero.subheadline`, `hero.desktopImageUrl`, `hero.mobileImageUrl` bajo `https://media.partnerhub.club/comunes/business/`, `benefits` de 1 a 4 elementos, `theme.fontPreset` y `theme.palettePreset` contra las listas oficiales PH-025, y `dedicationText` de 1 a 300 caracteres).
- Todo el renderizado dinámico en `app.js` emplea creación de nodos DOM (`createElement` / `createElementNS`) y `textContent`, eliminando la interpolación con `innerHTML` y garantizando que cualquier cadena con marcado HTML/script en el perfil se represente como texto literal y los perfiles malformados caigan de forma segura a los valores neutros del master.
- Se fijó el bloque obligatorio de transparencia (`#heroModelNotice`) junto al CTA principal de forma no removible (incluso cuando `businessMasterContent.ts` omite `modelNotice` o se envía `modelNotice.enabled: false`), informando que es una actividad independiente de venta directa, requiere inversión para compra inicial de producto y trabajo comercial constante, incluye acompañamiento formativo y no es una oferta de empleo.
- Se restringieron las etiquetas de CTA a intención real de WhatsApp (`Hablar por WhatsApp` y `Conocer la oportunidad`) sobre las URLs derivadas por el servidor, conservando todos los IDs de botones (`#btnNavContact`, `#main-vsl-cta`, `#secondary-vsl-cta`, `#btnRegisterFinal`, `#btnContactNegocioWa`, `#vsl-play-btn`).
- Se mantuvo visible el reproductor VSL con el título genérico `Ver presentación de negocio` y sin duración no validada, se desactivaron por defecto claims sin evidencia adjunta (`#trustHighlightsRow`), barra de prueba social (`#hero-social-proof`), testimonios (`#testimonios`) y navegación opcional de casos de éxito, no se añadieron listeners paralelos (`click_cta` / `WhatsAppClick`), y se ajustó el texto factual de privacidad para describir tanto el contacto voluntario por WhatsApp como las solicitudes técnicas `PageView` cuando el generador inyecta Meta Pixel.
- Se ajustó `styles.css` para la dirección visual juvenil azul, lima y blanco bajo el preset oficial `indigo-lime` y se corrigió el desbordamiento horizontal en móvil (`390px`).

## Files Changed

- `plantillas-de-pagina/business/config.js`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/index.html`
- `plantillas-de-pagina/business/styles.css`
- `app/web/scripts/business-paid-traffic-template.test.mjs`
- `brain/agent-requests/antigravity/reports/AGR-20261021-001_business_paid_traffic_template_DONE.md`

## Verification

- Build: `npm run lint` y `npm run build` desde `app/web` — PASS.
- Tests ejecutados:
  - `node --test scripts/business-paid-traffic-template.test.mjs scripts/business-master-runtime-packaging.test.mjs` — 5/5 PASS.
  - Integración con contrato backend PR #226 (`masterSitesBusinessContentGeneration.integration.test.mjs`, `businessLandingContentLegacyIngress.test.mjs`, `claudia-business-generation.integration.test.mjs`, `business-landing-content-contract.test.ts`) — 19/19 PASS.
- Verificación visual y responsive (Chrome Headless CDP en `1280x900` escritorio y `390x844` móvil, tanto en master genérico como con el perfil aprobado de Claudia Calero `modern` + `indigo-lime`):
  - `1280px`: `scrollWidth: 1265 <= 1280` (`noHorizontalOverflow: true`), VSL visible (`880x497`), aviso `#heroModelNotice` visible (`600x271`), CTAs primario y secundario alineados sin solapamiento (`noOverlapVslNotice: true`, `noOverlapNoticePrimary: true`, `noOverlapPrimarySecondary: true`).
  - `390px`: `scrollWidth: 375 <= 390` (`noHorizontalOverflow: true`), VSL visible (`327x186`), aviso `#heroModelNotice` legible (`327x354`), CTAs apilados a ancho completo (`327x58`) sin solapamientos.

## Git

- Branch: `antigravity/AGR-20261021-001-business-paid-traffic-template`
- Commit: registrado en la rama del PR.
- Pull request: abierto contra `main` para revisión de Codex.

## Remaining Risks

- El bloqueo por consentimiento previo para Meta Pixel documentado en `CDX-20261021-002` y la verificación pública del paquete generado para Claudia corresponden a sus gates separados antes de activar tráfico pagado.
- El test histórico `app/web/server/services/businessMasterContent.integration.test.mjs` contiene una aserción literal heredada sobre el antiguo titular `"Construye Libertad Financiera con un Hábito Diario"` en la línea 45 (fuera del alcance de archivos permitidos en este ticket).

## Follow-Up Needed

- Ejecutar `AGR-20261021-003` como rama y PR separados para actualizar exclusivamente la respuesta de la FAQ «¿Cuánto tiempo debo dedicarle a la semana?».
- Integración del editor Master Sites (`AGR-20261021-002`), gate de consentimiento (`CDX-20261021-002`) y regeneración/verificación del paquete de Claudia antes de publicar.
