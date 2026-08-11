# AGR-20260811-002 - Business/VSL high-conversion template polish

## Owner

Antigravity

## Model tier

Balanced

## Status

Pending

## Context

Jairo approved the direction explored in the local preview:

- Preview URL during review: `http://127.0.0.1:4186/`
- Preview source reference only: `tmp/previews/business-vsl-strategy/`
- Production template target: `plantillas-de-pagina/business`
- Public master target after approval/publication: `business.ganomaster.pro`

The preview is not the final implementation. Integrate the accepted behavior into the real Business template cleanly, preserving PartnerHub placeholders and theme contracts.

## Single Outcome

Update the Business/VSL template so it behaves as a high-conversion, Meta/Google-safer business presentation landing page with:

- video-first hero;
- persuasive but compliant copy;
- global theme-driven styling;
- full-width visual proof/video carousel;
- process-signal FOMO module;
- compact final CTA;
- no hardcoded partner-specific styling or claims.

## Allowed Files

- `plantillas-de-pagina/business/index.html`
- `plantillas-de-pagina/business/styles.css`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/config.js`
- `brain/agent-requests/antigravity/reports/AGR-20260811-002_business_vsl_high_conversion_template_polish_DONE.md`

## Excluded Files / Areas

- Do not edit backend, Prisma, API routes, Docker, deployment configuration, publication services, DNS, Hostinger, Cloudflare, R2 credentials, or generated output.
- Do not edit `tmp/previews/` as part of the final implementation.
- Do not publish to `business.ganomaster.pro`.
- Do not modify Product or Personal Brand templates.

## Dependencies

- Builds on completed request `AGR-20260807-004`.
- Must preserve PH-025 theme contract and PH-033/PH-041 ecosystem template contract.
- Safe to run in parallel with backend work only if no shared generated output or publication code is touched.

## Required UX / Content Direction

### Hero

The hero must make the video visible immediately on first page load.

Required order:

1. Badge.
2. Short headline.
3. Main presentation video.
4. Supporting text.
5. Social validation.
6. Decision band.
7. Trust/highlight row.

Use public-facing language. Do not use the term `VSL` in visible copy.

Approved hero copy baseline:

- Badge: `Presentacion completa de negocio`
- Headline: `Conoce un modelo de negocio digital con productos de consumo diario`
- Subheadline: `Tienda virtual, logistica corporativa y acompanamiento para evaluar la oportunidad con informacion completa.`
- Video CTA: `Ver la informacion completa`
- Video caption: `Primero entiende el modelo. Luego decide si quieres una conversacion personalizada.`

### CTA Language

Avoid long CTA button labels.

Approved defaults:

- Primary CTA: `Evaluar modelo`
- Secondary CTA: `Preguntar`
- Decision-band CTA: `Continuar`

Avoid:

- `Quiero Participar y Registrarme`
- `Mas Informacion por WhatsApp`
- any urgent registration copy that implies guaranteed outcomes or pressure.

### Layout / Visual System

- Preserve global PartnerHub theme placeholders from `theme.fontPreset` and `theme.palettePreset`.
- Do not hardcode final accent colors. Use existing CSS variables generated from the theme.
- Avoid section-by-section background blocks.
- Use one continuous page background and localized blurred light accents.
- Do not place UI cards inside larger decorative cards.
- Do not use boxed backgrounds unless the element genuinely needs framing, such as buttons, video surfaces, repeated cards, modals, FAQ rows, and toasts.
- The main video should not sit inside an extra boxed wrapper. Keep the video itself framed enough to be identifiable, but remove unnecessary outer boxes.
- Elements grouped with text + button must align as a set. If a button sits at the right, text should align left.
- Add subtle hover states to repeated boxed elements: trust items, comparison cards, benefit cards, methodology steps, FAQ rows, decision cards, video cards.
- Keep final CTA compact. Remove the duplicated partner identity inside the CTA card; identity remains in the footer only.
- Reduce dead vertical padding. Do not reserve space for a decorative element unless that element is visible and meaningful.

### Decision Band

Approved copy:

`Tu siguiente paso: mira la informacion completa y toma nota de tus preguntas. Una decision sana nace cuando entiendes el modelo antes de avanzar.`

CTA: `Continuar`

### Trust Row

Replace income-heavy trust copy with safer operational claims:

- `Logistica operativa`
- `Infraestructura internacional`
- `Productos de recompra`
- `Acompanamiento de equipo`

### Persuasive Sections

Keep the persuasion thread:

1. Challenge: people fail by starting without a system.
2. Clarity before starting.
3. Mechanism: market, product, infrastructure, support.
4. Decision sequence.
5. Visual proof.
6. Objection handling.
7. Final CTA.

Use copy from the approved preview as reference, but tighten where needed and avoid filler.

### Visual Proof / Video Carousel

Replace the current text testimonial cards in the `testimonios` section with a full-width video carousel matching the Product template behavior.

Requirements:

- The carousel itself must go edge-to-edge across the viewport, like the Product template.
- Header copy may remain constrained/centered above it.
- Use temporary Product videos until final Business videos are available:
  - `https://media.partnerhub.club/comunes/producto/v1/videos/v01.mp4`
  - through `v10.mp4`
- Prefer configurable source:
  - `config.testimonials.videoCarousel.items`
  - fallback to the Product common videos above.
- Autoplay muted loop playsinline.
- Horizontal continuous marquee behavior.
- Pause on hover.
- Video card hover effect.

Approved section copy:

- Badge: `Prueba visual`
- Title: `Historias reales para ver el modelo desde adentro`
- Subtitle: `Escucha experiencias, aprendizajes y puntos de vista de personas que han conocido el sistema, los productos y la forma de trabajo del equipo.`

Avoid placeholder copy like:

- `Aqui va...`
- `Por ahora...`
- `Video pendiente`
- `cuando se carguen...`

### Decision Momentum / FOMO Module

Implement a non-invasive lower-left process-signal notification module.

Purpose:

- Create a feeling of movement and decision activity.
- Do not claim income.
- Do not use names, ages, exact timestamps, ranks, or unverifiable real-time events.
- Do not suggest guaranteed or automatic results.

Behavior:

- Infinite feed. Do not stop after a fixed session count.
- Random interval between normal messages.
- Occasional longer pauses for natural rhythm.
- One notification visible at a time.
- Repetition is allowed, but avoid immediate back-to-back repetition when possible.
- Use `aria-live="polite"`.
- Hide or delay while document is hidden; resume naturally.

Suggested config contract:

```js
decisionMomentum: {
  enabled: true,
  feedUrl: "",
  intervalMinMs: 12000,
  intervalMaxMs: 28000,
  visibleMs: 5200,
  occasionalPauseChance: 0.22,
  occasionalPauseMinMs: 45000,
  occasionalPauseMaxMs: 90000,
  messages: [
    {
      label: "Interes reciente",
      text: "Una persona paso de ver la presentacion a solicitar orientacion inicial."
    }
  ],
  disclaimer: "Senales informativas del proceso. No representan ingresos ni resultados garantizados."
}
```

`feedUrl` should be optional and future-ready for a central JSON hosted by PartnerHub/R2/CDN. If `feedUrl` is empty or fails, use local safe fallback messages from `config.js`.

Recommended fallback messages:

- `Una persona paso de ver la presentacion a solicitar orientacion inicial.`
- `Alguien esta revisando la ruta de inicio antes de registrarse.`
- `Nuevo interesado evaluando tienda virtual, productos y acompanamiento.`
- `Una persona esta resolviendo objeciones antes de tomar una decision.`
- `Un interesado pidio claridad sobre inversion, productos y forma de trabajo.`
- `Alguien volvio a la presentacion para revisar si el modelo encaja con su perfil.`
- `Un interesado esta revisando las lineas de producto antes de avanzar.`
- `Una persona esta entendiendo como funciona la tienda y la logistica.`
- `Alguien esta revisando que apoyo recibe durante sus primeros pasos.`
- `Un visitante esta leyendo que depende de su actividad y que no esta garantizado.`

### Compliance Guardrails

Do not include claims such as:

- guaranteed income;
- automatic income;
- income in a fixed period;
- `gana X`;
- `deja tu empleo`;
- `libertad financiera asegurada`;
- `nuevo Oro/Bronce` unless backed by verified data;
- exact recent registrations unless backed by verified data;
- names or personal attributes in fake activity.

Required legal/disclaimer direction:

`Esta es una oportunidad de distribucion independiente basada en comercializacion y consumo de productos. No existen ingresos garantizados, automaticos ni universales. Los resultados dependen del esfuerzo personal, habilidades comerciales, constancia, tiempo dedicado, mercado, cumplimiento del sistema y condiciones de la compania. La informacion de esta pagina es educativa y comercial.`

## Verification Required

Antigravity must verify:

- Static preview of `plantillas-de-pagina/business`.
- Desktop and mobile layout.
- Hero video is visible on initial page load without excessive scroll.
- No visible `VSL` term in user-facing copy.
- No long CTA labels remain in hero/final CTA.
- No duplicated partner name inside final CTA; footer identity remains.
- Video carousel is full-width.
- Decision momentum notifications continue beyond initial messages and do not stop after a fixed max-per-session.
- Theme changes still flow from `config.theme.palettePreset` and `config.theme.fontPreset`.
- No console errors.
- `npm run build` passes from `app/web`.

## Report Required

Create:

`brain/agent-requests/antigravity/reports/AGR-20260811-002_business_vsl_high_conversion_template_polish_DONE.md`

Include:

- Request ID.
- Summary of implemented changes.
- Files changed.
- Verification performed.
- Build result.
- Branch, commit, and PR if applicable.
- Remaining risks or follow-up.

## Production Note

Do not publish to `business.ganomaster.pro` in this request. After the report is reviewed and Jairo approves the final preview, production publication must be handled as a separate controlled publication step.
