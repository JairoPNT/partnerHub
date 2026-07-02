# Proyecto: Plataforma SaaS para Empresarios de Multinivel

## Documento de visión y arquitectura (MVP)

**Versión:** 0.1\
**Fecha:** 2026-07-02

------------------------------------------------------------------------

# 1. Visión

Construir una plataforma SaaS administrada por Maeva Studio que permita
crear, administrar y actualizar sitios personalizados para empresarios
de multinivel, con un sistema central (Sitio Máster) desde el cual se
controlan contenidos, campañas y activos digitales.

La plataforma debe servir tanto para la venta de productos como para la
presentación de la oportunidad de negocio mediante una VSL.

------------------------------------------------------------------------

# 2. Objetivos

-   Automatizar la creación de sitios.
-   Reducir tiempos de implementación.
-   Centralizar la actualización de contenidos.
-   Ofrecer un servicio recurrente con mensualidad.
-   Escalar a cientos de empresarios sin duplicar trabajo.

------------------------------------------------------------------------

# 3. Productos ofrecidos

## Landing de Productos

-   Venta de productos y kits.
-   WhatsApp personalizado.
-   Productos, beneficios y precios.
-   CTA.
-   SEO básico.

## VSL de Negocio

-   Video principal.
-   Presentación del negocio.
-   Testimonios.
-   Objeciones.
-   CTA.
-   Formulario o WhatsApp.

## Plan Completo

Incluye Landing + VSL.

------------------------------------------------------------------------

# 4. Sitio Máster

Será la fuente de verdad del sistema.

Controlará:

-   Productos
-   Kits
-   Precios
-   Imágenes
-   Videos
-   Copys
-   Banners
-   FAQs
-   Promociones
-   Guiones VSL
-   Material de campañas

Los cambios podrán aplicarse:

-   A todos los empresarios.
-   A un grupo específico.
-   A un solo empresario.

------------------------------------------------------------------------

# 5. Módulos del software

## Dashboard

-   KPIs
-   Sitios activos
-   Pagos
-   Pendientes
-   Accesos rápidos

## Empresarios

-   Datos personales
-   Datos comerciales
-   Estado
-   Plan
-   Historial
-   Botón al sitio

## Constructor

-   Crear landing
-   Crear VSL
-   Generar enlaces
-   Publicar

## Banco Creativo

-   Landing
-   Meta Ads
-   WhatsApp
-   Historias
-   Videos
-   Fotos

## Campañas

-   Brief
-   Copy
-   Creativos
-   UTM
-   Presupuesto
-   Estado

## Checklist

-   Datos
-   Landing
-   Dominio
-   SSL
-   WhatsApp
-   Publicación
-   Entrega

## Reportes

-   Visitas
-   Leads
-   Clics
-   Conversión
-   Pagos

------------------------------------------------------------------------

# 6. Flujo operativo

1.  Registrar empresario.
2.  Elegir plan.
3.  Generar landing y/o VSL.
4.  Personalizar datos.
5.  Crear enlaces.
6.  Publicar.
7.  Validar checklist.
8.  Activar campañas.
9.  Entregar.
10. Mantener mediante el Sitio Máster.

------------------------------------------------------------------------

# 7. Integraciones previstas

-   VPS
-   Servidor web
-   PostgreSQL
-   Redis
-   Docker
-   Nginx
-   n8n
-   Meta Ads API (fase avanzada)
-   WhatsApp Business Platform (fase avanzada)

------------------------------------------------------------------------

# 8. Arquitectura técnica

Frontend: - Next.js

Backend: - Node.js (NestJS) o Laravel

Base de datos: - PostgreSQL

Automatización: - n8n

Almacenamiento: - Cloudflare R2 o almacenamiento del VPS

------------------------------------------------------------------------

# 9. Roadmap

## Fase 1 (3--5 semanas)

-   Login
-   Dashboard
-   CRUD empresarios
-   Landing
-   VSL básica
-   Sitio Máster
-   Banco creativo
-   Checklist

## Fase 2 (6--8 semanas)

-   Panel empresario
-   Gestión de pagos
-   Replicación inteligente
-   Reportes
-   Dominios
-   Campañas en modo briefing

## Fase 3 (10--16 semanas)

-   Meta Ads API
-   WhatsApp API
-   Panel de líderes
-   Métricas avanzadas
-   Automatización completa
-   Multiempresa

------------------------------------------------------------------------

# 10. Modelo de negocio

## Plan Producto

Setup: \$297.000 COP

Mensualidad: \$97.000 COP

## Plan Negocio

Setup: \$397.000 COP

Mensualidad: \$127.000 COP

## Plan Completo

Setup: \$597.000 COP

Mensualidad: \$197.000 COP

## Plan Líder

Setup: \$1.500.000--\$3.000.000 COP

Mensualidad: \$500.000--\$1.500.000 COP

------------------------------------------------------------------------

# 11. Próximos entregables

1.  Documento funcional completo.
2.  Modelo de base de datos (ERD).
3.  Wireframes de todas las pantallas.
4.  Arquitectura técnica detallada.
5.  Plan de automatizaciones con n8n.
6.  Backlog MVP.
7.  Plan de desarrollo por sprints.
8.  Estrategia comercial y de lanzamiento.

------------------------------------------------------------------------

# 12. Visión de largo plazo

Convertir la plataforma en un SaaS especializado para redes de
multinivel, administrado inicialmente por Maeva Studio y escalable
posteriormente a otros sectores mediante plantillas, automatizaciones y
módulos reutilizables.
