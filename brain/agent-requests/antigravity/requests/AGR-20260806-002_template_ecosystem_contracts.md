# AGR-20260806-002 - Contratos de plantillas Business y Personal Brand

## Owner

Antigravity. Frontend, plantillas HTML/CSS/JS y UX. No modificar backend, Prisma, auth, Docker ni migraciones.

## Objetivo

Preparar las plantillas para heredar los datos y el tema visual PH-025 sin duplicar logica ni crear editores libres.

## Alcance

### Plantilla Business / VSL

- Crear una estructura base replicable con placeholders de identidad, hero, VSL, CTA, contacto, SEO, analytics y tema.
- El HTML no debe contener nombres, URLs de compra, telefonos ni imagenes de empresarios reales.
- Todos los enlaces y textos variables deben resolverse desde `config.js`/configuracion equivalente.

### Plantilla Personal Brand

- Crear estructura base con bloques activables: perfil, biografia/propuesta, servicios/negocios, enlaces sociales, eventos externos, contacto y CTA.
- Limitar inicialmente a bloques y campos definidos; no permitir HTML libre.
- Los enlaces sociales, negocios y agenda deben ser datos configurables.
- Definir limites iniciales: hasta 4 servicios/negocios, hasta 8 enlaces externos y hasta 6 eventos/enlaces de agenda.

### Tema visual

- Ambas plantillas deben leer `theme.fontPreset` y `theme.palettePreset`.
- Aplicar tipografia y paleta a header, botones, CTA, enlaces, cards, formularios y estados, no solo al body.
- Conservar fallback seguro cuando no exista tema.
- Reutilizar los presets existentes de PH-025 y documentar los que no sean compatibles.

## Verificacion obligatoria

- Probar con configuracion generica, sin nombres de clientes existentes.
- Verificar que cambiar font/palette modifica visualmente los elementos principales.
- `npm run build`.
- Reportar rutas/archivos, limitaciones y dependencias backend.
- Usar rama `antigravity/AGR-20260806-002-template-ecosystem-contracts` y abrir PR hacia `main`.
