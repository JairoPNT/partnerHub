# PH-025 - Personalizacion Visual de Paginas de Producto

## Estado

Contrato base implementado en generador y plantilla. Pendiente selector visual en UI por Antigravity.

## Objetivo

Permitir que las paginas de producto mantengan una estructura comun replicable, pero con diferenciacion visual controlada por empresario.

## Tres Grados de Personalizacion

### 1. Cambios Master

Se gestionan desde `/master-site` y se publican primero en `ganomaster.pro`.

Incluyen:

- Estructura de secciones.
- Contenido comun.
- Imagenes de productos.
- Videos comunes.
- Copy base.
- Cambios de layout global.

Estos cambios solo se replican a clientes despues de revision y aprobacion.

### 2. Datos Personales y Enlaces

Se gestionan desde `/partners` y `/landing-builder`.

Incluyen:

- Nombre de marca.
- Nombre del empresario.
- Telefonos.
- WhatsApp.
- URL de compra.
- Hero desktop.
- Hero mobile.
- Logo o nombre tipografico.
- SEO.
- Analytics.

Estos datos son propios de cada empresario y no deben ser sobrescritos por cambios del master.

### 3. Estilo Propio del Empresario

Se gestiona por pagina/empresario y no modifica la estructura.

Incluye:

- Combinacion de colores.
- Preset tipografico.

El objetivo es dar variedad visual sin romper el sistema replicable.

## Presets Tipograficos

Valores soportados por el contrato:

- `executive`: Montserrat + Space Grotesk.
- `modern`: Outfit + Inter.
- `editorial`: Playfair Display + Lora + Inter.
- `friendly`: Poppins + DM Sans.
- `premium`: Manrope + Lora.
- `minimal`: Inter.

## Presets de Color

Valores soportados por el contrato:

- `cobalt-cyan`
- `emerald-slate`
- `coffee-gold`
- `rose-graphite`
- `indigo-lime`
- `teal-navy`
- `wine-blush`
- `forest-mint`
- `charcoal-amber`
- `sky-stone`

## Contrato Tecnico

La configuracion de pagina debe soportar:

```js
theme: {
  fontPreset: "executive",
  palettePreset: "cobalt-cyan"
}
```

La plantilla aplica estos valores como variables CSS en tiempo de carga.

## Regla de Replicacion

Al replicar cambios del master hacia clientes:

- Se actualiza estructura y contenido comun.
- Se conservan datos personales.
- Se conserva `theme`.
- Se conserva `integrations`.

## Pendiente UI

Antigravity debe crear selectores simples en `/landing-builder` y en el detalle del empresario:

- Selector de tipografia con 6 opciones.
- Selector de paleta con 10 opciones.
- Vista previa breve antes de publicar.

## Ajuste Codex 2026-07-31: Hidratacion desde pagina guardada

Contexto:

- `/landing-builder` podia seleccionar un empresario publicado y mostrar vacios los heroes o volver a presets por defecto porque leia principalmente `onboardingData`.
- Las paginas ya generadas guardan su configuracion efectiva en la fuente JSON del sitio, no siempre en el lead administrativo.

Decision:

- Al seleccionar un empresario en `/landing-builder`, si existe una fuente de pagina para su `siteId`, esa configuracion tiene prioridad para precargar:
  - heroes desktop/mobile;
  - tema visual `theme.fontPreset` y `theme.palettePreset`;
  - datos del distribuidor;
  - SEO;
  - Analytics;
  - URL de compra.
- El lead administrativo solo rellena campos faltantes.
- Los errores de validacion del generador deben listar los campos pendientes en vez de mostrar un mensaje generico.
