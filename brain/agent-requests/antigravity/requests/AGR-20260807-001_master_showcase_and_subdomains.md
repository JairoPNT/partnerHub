# AGR-20260807-001 - Showcase Central ganomaster.pro y Mapeo de Subdominios

## Owner
Antigravity (Lead Product Designer & Frontend Lead).

## Objetivo
Diseñar e implementar el portal vitrina interactivo para el dominio raíz `ganomaster.pro` (Alternativa 1 seleccionada) y actualizar los mapeos de subdominios oficiales para cada ecosistema (`product.ganomaster.pro`, `business.ganomaster.pro` y `brand.ganomaster.pro`).

---

## Alcance

1. **Showcase Interactivo en `ganomaster.pro`**:
   - Landing page premium y moderna en la raíz `ganomaster.pro` que presenta la suite completa de los 3 ecosistemas de PartnerHub:
     - **Ecosistema de Producto:** Tarjeta interactiva con preview visual, características clave y enlace directo a `https://product.ganomaster.pro`.
     - **Ecosistema de Negocio (VSL):** Tarjeta interactiva con preview del video player/propuesta y enlace directo a `https://business.ganomaster.pro`.
     - **Ecosistema de Marca Personal:** Tarjeta interactiva con preview de bio-link/bloques y enlace directo a `https://brand.ganomaster.pro`.
   - **Demostrador de Temas Visuales (PH-025)**: Controles en vivo para previsualizar los estilos de fuentes y paletas cromáticas sobre las tarjetas del showcase.
   - Arquitectura modular y extensible para poder incorporar futuras plantillas (eventos, catálogo, webinars) sin tocar las existentes.

2. **Actualización de Vistas de Administración**:
   - En `/master-sites`, actualizar los dominios maestros de cada pestaña:
     - Producto: `product.ganomaster.pro` (o `ganomaster.pro` en transición).
     - Negocio: `business.ganomaster.pro`.
     - Marca Personal: `brand.ganomaster.pro`.
   - Mostrar botones de enlace externo directo a cada subdominio oficial.

3. **Actualización de Contratos Tipados**:
   - Registrar la constante oficial de mapeo de subdominios en `app/web/lib/ecosystem-contracts.ts`.

---

## Fuera de Alcance
- Creación de servidores DNS o registros manuales en Cloudflare/Hostinger (tarea de infraestructura).
- Modificaciones a base de datos, Prisma o backend de autenticación.

---

## Verificación Obligatoria
- Responsive desktop / tablet / móvil.
- `npm run build` sin errores.
- Reporte obligatorio `AGR-20260807-001_master_showcase_and_subdomains_DONE.md`.
- Rama `antigravity/AGR-20260807-001-master-showcase-and-subdomains` y PR hacia `main`.
