# PH-034 - Arquitectura de Subdominios y Showcase Central para Masters

## Fecha de Aprobación
2026-08-06

## Decisión Estratégica y Arquitectura de Dominios

Para eliminar el riesgo de errores cruzados entre ecosistemas y desacoplar totalmente las plantillas maestras, se establece que cada ecosistema cuenta con su propio subdominio independiente bajo `ganomaster.pro`, mientras que el dominio raíz actúa como **Showcase Interactivo y Vitrina Central**:

---

## 1. Mapeo Canónico de Dominios y Subdominios

| Entorno / Ecosistema | `siteId` Canónico | Dominio / Subdominio Oficial | Rol / Propósito |
| :--- | :--- | :--- | :--- |
| **Hub Central / Showcase** | `ganomaster-showcase` | `ganomaster.pro` | Portal interactivo vitrina con acceso y selector de los 3 ecosistemas, switcher de temas visuales y escalabilidad para futuras plantillas. |
| **Master Producto** | `ganomaster` | `product.ganomaster.pro` | Landing comercial pura de producto (Ganoderma Lucidum). Desacoplada e independiente. |
| **Master Negocio (VSL)** | `ganomaster-business` | `business.ganomaster.pro` | Landing comercial pura de prospección y video (VSL). Desacoplada e independiente. |
| **Master Marca Personal** | `ganomaster-personal-brand` | `brand.ganomaster.pro` | Hub profesional puro de enlaces, servicios, bio y agenda. Desacoplado e independiente. |

---

## 2. Ventajas Técnicas y Operativas

1. **Aislamiento de Errores (Zero Blast Radius):** Modificar o actualizar la plantilla de un ecosistema (ej. Negocio) no tiene ningún impacto sobre Producto o Marca Personal.
2. **Escalabilidad Futura:** Permite añadir futuros subdominios (`eventos.ganomaster.pro`, `catalogo.ganomaster.pro`, etc.) sin reconfigurar la base existente.
3. **Vitrina Comercial de Alto Impacto:** `ganomaster.pro` sirve como demostración comercial viva donde los empresarios pueden experimentar la oferta completa de PartnerHub y visualizar los temas visuales (PH-025).

---

## 3. Plan de Ejecución

1. **Frontend / Showcase UI (Antigravity - `AGR-20260807-001`):**
   - Diseñar la landing showcase en `ganomaster.pro` con tarjetas interactivas hacia `product.ganomaster.pro`, `business.ganomaster.pro` y `brand.ganomaster.pro`.
   - Incluir selector interactivo de paletas y tipografías para demostraciones.
   - Actualizar las vistas de administración (`/master-sites` y `/partners`) con los subdominios canónicos asignados.
2. **Infraestructura & DNS (Hostinger / Cloudflare):**
   - Configurar los registros CNAME / A para `product`, `business` y `brand` apuntando al host correspondiente con SSL automático.
3. **Backend & Replicación (Codex):**
   - Ajustar los mapeos de dominio por defecto en los servicios de generación y verificación para utilizar los subdominios respectivos.

## PH-035 Update - Canonical Publication Paths

The master ecosystem pages now publish to dedicated subdomain routes:

- `ganomaster` -> `https://product.ganomaster.pro` -> `/home/u658137804/domains/ganomaster.pro/public_html/product`
- `ganomaster-business` -> `https://business.ganomaster.pro` -> `/home/u658137804/domains/ganomaster.pro/public_html/business`
- `ganomaster-personal-brand` -> `https://brand.ganomaster.pro` -> `/home/u658137804/domains/ganomaster.pro/public_html/brand`

These routes are controlled in backend publication services and are not treated as client domains.
