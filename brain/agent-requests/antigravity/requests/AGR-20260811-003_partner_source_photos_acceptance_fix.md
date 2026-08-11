# AGR-20260811-003 - Partner source photos acceptance fix

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- Follow-up to completed request `AGR-20260811-001`.
- Apply this fix to the existing branch `antigravity/AGR-20260811-001-partner-source-photos-visibility` before creating its PR, or as a new commit if the PR is already open.

## Single outcome

Bring the AGR-20260811-001 implementation into acceptance by filtering invalid URLs from the source photos array, preventing navigation to broken URLs, and localizing the image alternative texts to Spanish.

## Required corrections

1. **Filtro de URLs HTTPS válidas**: Filtra el arreglo `onboardingData.sourcePhotos` para aceptar exclusivamente URLs que comiencen con `https://`.
2. **Uso de la lista filtrada**: Utiliza este arreglo ya filtrado tanto para el contador de fotografías en el encabezado (badge) como para la iteración de la galería.
3. **Prevención de navegación rota**: Evita que una miniatura que falló en cargar (broken thumbnail) continúe navegando a una URL rota al hacerle clic.
4. **Textos alternativos en español**: Usa textos alternativos (alt text) en español para las imágenes, por ejemplo: `Fotografía fuente ${idx + 1}`.
5. **Alcance intacto**: Mantén absolutamente intacta la lógica de completitud del *hero*, así como la carga, generación y publicación.

## Allowed files/modules

- `app/web/components/entrepreneur-operations-view.tsx`
- Matching `AGR-20260811-003` completion report.

## Excluded files/modules

- Backend, API, Prisma, templates, generated sites, deployment and environment configuration.
- Hero completeness logic.
- Upload, generation and publication behavior.
- Other modules and visual cleanup.

## Acceptance criteria

1. El arreglo `sourcePhotos` es filtrado por protocolo `https://`.
2. El contador y la galería reflejan únicamente las fotos válidas.
3. Hacer clic en una miniatura con imagen rota no navega hacia un enlace roto.
4. El atributo `alt` de las imágenes utiliza español (`Fotografía fuente...`).
5. La completitud, carga, generación y publicación siguen intactas.
6. El branch diff permanece confinado al componente autorizado y los reportes.

## Verification

- Targeted ESLint for `entrepreneur-operations-view.tsx`.
- `npm run build` from `app/web`.
- Documenta validación real con:
  - Un partner con fotos válidas.
  - Un partner sin fotos.
  - Verificación de la vista móvil.
  - Confirmación en la pestaña Network (Red) del navegador de que NO se realiza ninguna nueva llamada API para consultar la galería.

## Required report

- `brain/agent-requests/antigravity/reports/AGR-20260811-003_partner_source_photos_acceptance_fix_DONE.md`
