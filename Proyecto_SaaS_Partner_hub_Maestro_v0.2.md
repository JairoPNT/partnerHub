# Proyecto SaaS para Empresarios de Multinivel
## Documento Maestro del Proyecto (Versión 0.2)

**Fecha:** 2026-07-02

# Visión

Construir una plataforma SaaS administrada inicialmente por Maeva Studio para ayudar a empresarios de multinivel a vender productos, presentar la oportunidad de negocio y gestionar su presencia digital desde un único ecosistema.

La primera implementación será para Gano Excel, pero la arquitectura estará diseñada para ser reutilizable con otras compañías de venta directa y multinivel.

---

# Propuesta de valor

No vendemos una landing.

Vendemos un ecosistema digital administrado que permite vender productos, presentar el negocio, automatizar procesos, mantener contenidos actualizados y escalar sin conocimientos técnicos.

---

# Modelo de implementación

## Opción 1 – Sistema de Venta de Productos

- Dominio .pro personalizado.
- Hosting administrado.
- Landing personalizada.
- Información oficial de productos.
- Configuración del BackOffice Gano Excel.
- Enlaces y WhatsApp personalizados.
- Configuración inicial de IA para WhatsApp Business.
- Banco de imágenes.
- Actualizaciones desde el Sitio Máster.

**Implementación:** $400.000 COP

**Servicio de gestión y actualización:** $100.000 COP/mes

## Opción 2 – Sistema de Presentación del Negocio (VSL)

Incluye la misma infraestructura técnica que la opción 1:

- Dominio .pro.
- Hosting.
- Configuración técnica.
- WhatsApp.
- IA para WhatsApp Business.

Además:

- Página VSL.
- Video principal.
- Presentación del negocio.
- CTA y captación de prospectos.

**Implementación:** $400.000 COP

**Servicio de gestión y actualización:** $100.000 COP/mes

## Opción 3 – Ecosistema Completo

- Landing de productos.
- Página VSL.
- Una sola infraestructura.
- Un solo dominio.
- Un solo hosting.
- Una sola configuración técnica.
- Un solo asistente de IA.

**Implementación:** $600.000 COP

**Servicio de gestión y actualización:** $150.000 COP/mes

Si el cliente inicia con cualquiera de las dos opciones individuales, posteriormente podrá activar la segunda plataforma pagando únicamente un **upgrade de $200.000 COP**.

---

# Sitio Máster

Administrará productos, kits, precios, promociones, imágenes, videos, copys, FAQs, recursos comerciales y guiones VSL.

Los cambios podrán replicarse globalmente, por grupos o de forma individual.

---

# Módulos

1. Dashboard
2. Empresarios
3. Constructor de sitios
4. Sitio Máster
5. Banco creativo
6. Campañas
7. Checklist
8. Reportes
9. Pagos
10. Dominios

---

# Banco Creativo

- Landing
- WhatsApp
- Meta Ads
- Videos
- VSL
- Productos
- Estados
- Historias

---

# Automatizaciones

Con n8n:

- Alta de empresarios.
- Generación de sitios.
- Enlaces personalizados.
- Publicación.
- Checklist.
- Notificaciones.
- Actualizaciones.

---

# Arquitectura

Frontend: Next.js

Backend: NestJS (preferido) o Laravel

Base de datos: PostgreSQL

Infraestructura: VPS, Docker, Nginx, Redis, n8n.

---

# Roadmap

## Fase 1

Pre-MVP comercial con Landing de Productos.

## Fase 2

MVP con VSL, panel y replicación inteligente.

## Fase 3

Meta Ads, WhatsApp Business API, líderes, multiempresa y analítica.

---

# Modelo de negocio

Ingresos por:

- Implementación.
- Gestión y actualización mensual.
- Upgrades.
- Campañas.
- Automatizaciones.
- Servicios premium.

La mensualidad cubre actualización de contenidos, imágenes, mantenimiento preventivo, soporte, promociones y evolución continua de la plataforma.

---

# Próximos entregables

1. PRD.
2. Modelo de datos.
3. Wireframes.
4. Arquitectura.
5. Backlog.
6. Automatizaciones.
7. APIs.
8. Estrategia comercial.
9. Plan de lanzamiento.
