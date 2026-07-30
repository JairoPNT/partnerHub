# PH-019 - Carga automatica de heroes a Cloudflare R2

## Decision

El operador selecciona la imagen desde el dashboard. PartnerHub valida y convierte el archivo a WebP, lo sube a R2 y devuelve la URL publica. El operador no escribe URLs ni navega manualmente por el bucket.

## Rutas fijas

- `clientes/{siteId}/producto/v1/hero-desktop.webp`
- `clientes/{siteId}/producto/v1/hero-mobile.webp`

La ruta publica se construye con `R2_PUBLIC_BASE_URL`, actualmente `https://media.partnerhub.club`.

El endpoint S3/R2 configurado para el bucket es:
`https://432a9c2d446773ce8cb3abe45f1f9d89.r2.cloudflarestorage.com`

La referencia local de credenciales se encuentra en `.local-secrets/partnerhub-r2.md`; ese directorio esta excluido de Git.

## Endpoint interno

`POST /api/internal/media/hero` como `multipart/form-data` con:

- `siteId`
- `variant`: `hero-desktop` o `hero-mobile`
- `file`

El endpoint limita el archivo a 12 MB, acepta imagenes, normaliza orientacion y convierte a WebP.

## Configuracion de EasyPanel

Las credenciales solo viven como variables de entorno del servicio PartnerHub:

- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET=partnerhub-media-prod`
- `R2_PUBLIC_BASE_URL=https://media.partnerhub.club`

Nunca se incluyen en el navegador, GitHub, configuracion de la pagina ni respuestas de la API.
