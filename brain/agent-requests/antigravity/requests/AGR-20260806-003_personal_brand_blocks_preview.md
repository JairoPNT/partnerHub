# AGR-20260806-003 - Preview de bloques para Marca Personal

## Owner

Antigravity. UI/UX exclusivamente.

## Objetivo

Diseñar el editor administrativo de bloques de Marca Personal sin convertirlo en un constructor ilimitado.

## Alcance

- Vista de configuracion con bloques activables y ordenables: perfil, propuesta, negocios/servicios, enlaces, eventos y contacto.
- Formularios con limites y validacion para las cantidades definidas en AGR-20260806-002.
- Preview lateral o inferior usando datos genericos, nunca datos reales de otro empresario.
- Estados de bloque: activo, inactivo, incompleto.
- Mensaje claro cuando una funcion requiere una integracion futura.
- Reutilizar selector de tipografia y paleta PH-025.

## Fuera de alcance

- Editor HTML libre.
- Calendario propio.
- CRM, agenda transaccional, reservas o automatizaciones.
- Backend, Prisma, endpoints o migraciones.

## Verificacion obligatoria

- Responsive desktop/mobile.
- Accesibilidad basica de tabs, botones y formularios.
- `npm run build`.
- Reporte obligatorio con riesgos y contratos backend faltantes.
- Usar rama `antigravity/AGR-20260806-003-personal-brand-blocks-preview` y abrir PR hacia `main`.
