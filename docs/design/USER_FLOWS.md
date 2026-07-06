# UX User Flows — PartnerHub

> [!IMPORTANT]
> **USER_FLOWS.md is exploratory UX documentation. It is not implementation approval. Final implementation depends on PH-003A, PH-003B and PH-003C.**

# Scope Classification

Cada flujo documentado en este archivo se clasifica bajo los siguientes estados de alcance técnico:

*   **Partner Purchase**: MVP Allowed.
*   **Partner Dashboard**: Needs Role Clarification / Do Not Implement Until PH-003B.
    *   *Nota*: Partner Dashboard no equivale a dashboard del empresario. El empresario no tendrá dashboard en MVP. El dashboard inicial está permitido únicamente para fines de **admin/internal operations** (administración y operaciones internas).
*   **Landing Management**: Needs Business Validation.
*   **VSL Builder**: MVP Allowed only without AI integrations.
*   **Campaign Manager**: Future Epic / Ads Service.
*   **Asset Library**: Future Epic / Social Launch Engine.
*   **Master Site**: Admin Only.
*   **Settings**: MVP Allowed with constraints.

---


## 1. Partner Purchase (Compra de Plan por Socio)
Este flujo describe la jornada de adquisición desde que un futuro socio ingresa al embudo público de ventas del inquilino (Tenant) hasta que su entorno es aprovisionado y recibe sus credenciales.

```mermaid
flowchart TD
    A["Landing Pública (Tenant)"] --> B["Selección de Plan (Catalogo)"]
    B --> C["Formulario de Registro (Creación Cuenta)"]
    C --> D["Pasarela de Pago (Stripe/Manual Checkout)"]
    D -->|Pago Fallido| E["Pantalla de Reintento / Soporte"]
    D -->|Pago Exitoso| F["Aprovisionamiento Automático"]
    F --> G["Crear Registro de Socio (Prisma DB)"]
    F --> H["Generar Subdominio Replicado (partner.tenant.com)"]
    F --> I["Desplegar Landings y VSL por Defecto"]
    G & H & I --> J["Email de Bienvenida con Credenciales"]
    J --> K["Primer Acceso (Onboarding Wizard)"]
    E --> D
```

### Acciones Clave:
- **Validación de Subdominio**: Comprobación en tiempo real para evitar nombres de subdominios duplicados durante el registro.
- **Webhook de Pago**: Disparo del flujo de aprovisionamiento en la API del Backend una vez confirmado el pago.

---

## 2. Partner Dashboard (Panel del Socio)

> [!WARNING]
> **Needs Role Clarification / Do Not Implement Until PH-003B.**
> Partner Dashboard no equivale a dashboard del empresario. El empresario no tendrá dashboard en MVP. El dashboard inicial permitido es solo para administración y operaciones internas (admin/internal operations).

Mapea la interacción diaria del socio para medir su negocio, ver estadísticas de tráfico de sus enlaces y acceder rápidamente a sus herramientas de prospección.

```mermaid
flowchart TD
    A["Login Exitoso"] --> B["Vista Principal (Dashboard)"]
    B --> C["Sección de KPIs (Visitas, Leads, Ventas)"]
    B --> D["Sección de Accesos Rápidos (Compartir Links)"]
    B --> E["Sección de Checklist / Onboarding"]
    
    D --> D1["Copiar Enlace de Landing"]
    D --> D2["Copiar Enlace de VSL"]
    
    E -->|Pendiente| E1["Completar Configuración Inicial"]
    E -->|Completado| E2["Mostrar Siguiente Paso de Crecimiento"]
    
    C --> F["Gráfico de Desempeño (Tráfico Semanal)"]
```

### Acciones Clave:
- **Micro-interacciones**: Copiado con un solo click (Feedback visual de "Copiado").
- **Gamificación**: Checklist interactivo que ayuda al socio a configurar su perfil y dominios paso a paso.

---

## 3. Landing Management (Gestión de Landings)
Describe cómo un socio puede ver, previsualizar y editar de forma básica las páginas de aterrizaje de productos replicadas a partir del Sitio Maestro.

```mermaid
flowchart TD
    A["Dashboard"] --> B["Modulo Landings"]
    B --> C["Listado de Landings Asignadas"]
    C --> C1["Previsualizar Landing"]
    C --> C2["Editar Configuración (Landing Editor)"]
    
    C2 --> D["Configurar WhatsApp de Contacto"]
    C2 --> E["Personalizar Textos del Hero / Oferta"]
    C2 --> F["Configurar Script de Tracking Personalizado (Pixel)"]
    
    D & E & F --> G["Guardar Cambios"]
    G --> H["Actualizar Caché del Edge (Despliegue Instantáneo)"]
```

### Acciones Clave:
- **Campos Controlados**: El socio no altera el layout principal, solo las variables permitidas (WhatsApp, Pixel ID, Título del Hero).

---

## 4. VSL Builder (Constructor VSL)

> [!NOTE]
> **MVP Allowed only without AI integrations.**
> AI video generation, HeyGen and ElevenLabs are excluded from MVP and deferred to EPIC-800 AI Content Studio.

Flujo para la creación y optimización de páginas enfocadas en Video Sales Letters (Cartas de Venta en Video) con aparición retardada del botón de compra (CTA).

```mermaid
flowchart TD
    A["Dashboard"] --> B["Modulo VSL Builder"]
    B --> C["Ficha de VSL Activos"]
    C --> D["Crear / Editar VSL Page"]
    
    D --> E["Vincular Video (YouTube, Vimeo, Vdocipher)"]
    D --> F["Establecer Retardo del Botón CTA (Segundos de video)"]
    D --> G["Configurar Formulario de Captación de Leads"]
    
    F --> F1["Botón oculto al iniciar el video"]
    F1 -->|Tiempo transcurrido = X seg| F2["Aparece Botón CTA de Compra con Micro-animación"]
    
    G --> G1["Lead registrado en DB"]
    G1 --> G2["Notificación Instantánea al Socio"]
```

### Acciones Clave:
- **Retardo Dinámico**: Sincronización del reproductor de video mediante JS para disparar eventos de visibilidad en el DOM.

---

## 5. Campaign Manager (Gestión de Campañas)

> [!WARNING]
> **Future Epic / Ads Service.**
> Future Epic. Paid campaigns are an additional service and require separate business rules, budget approval, ad account validation and cost breakdown.

Permite al socio o administrador crear enlaces parametrizados para redes sociales y pauta publicitaria, rastreando conversiones exactas.

```mermaid
flowchart TD
    A["Dashboard"] --> B["Modulo Campañas"]
    B --> C["Creador de Enlaces UTM"]
    
    C --> D["Ingresar URL Destino (Landing o VSL)"]
    C --> E["Definir Parámetros (Origen, Medio, Campaña)"]
    C --> F["Generar Enlace Corto / Código QR"]
    
    F --> G["Compartir en Canales (Facebook, TikTok, Ads)"]
    G --> H["Visita de Lead con UTMs"]
    H --> I["Registro de Atribución en Analytics"]
```

### Acciones Clave:
- **Rastreador de Orígenes**: Asocia cada lead registrado con sus respectivas variables de UTM para reportar qué red social está trayendo mejores resultados.

---

## 6. Asset Library (Biblioteca de Recursos)

> [!WARNING]
> **Future Epic / Social Launch Engine.**
> Future Epic. Related to Social Launch Engine / Meta Assets Preparation.

Flujo para que los socios descarguen imágenes, videos publicitarios y copys listos para publicar en sus redes sociales.

```mermaid
flowchart TD
    A["Dashboard"] --> B["Modulo Biblioteca de Assets"]
    B --> C["Explorador de Recursos (Galería)"]
    
    C --> D["Filtrar por Categoría (Imágenes, Videos, Textos)"]
    C --> E["Filtrar por Producto / Campaña"]
    
    C --> F["Recurso Gráfico"] --> F1["Descargar Archivo Directo"]
    C --> G["Copy / Texto sugerido"] --> G1["Copiar al Portapapeles"]
    
    F1 & G1 --> H["Compartir en Redes Sociales del Socio"]
```

### Acciones Clave:
- **Optimización de Assets**: Visualización rápida en miniatura y descargas comprimidas para optimizar ancho de banda.

---

## 7. Master Site (Sitio Maestro)
Este flujo está reservado para el Administrador del Tenant (Dueño de la marca). Define cómo crea y propaga el contenido maestro y las plantillas a todos los socios.

```mermaid
flowchart TD
    A["Acceso Admin de Marca"] --> B["Modulo Master Site"]
    B --> C["Editor de Contenido Replicable"]
    
    C --> D["Actualizar Catálogo de Productos Maestros"]
    C --> E["Crear Nueva Plantilla de Landing o VSL"]
    C --> F["Modificar Copys Globales de Promoción"]
    
    D & E & F --> G["Guardar Borrador"]
    G --> H["Publicar y Propagar Cambios"]
    H --> I["Actualizar todas las webs de socios asociadas en background"]
```

### Acciones Clave:
- **Propagación en Cascada**: Actualización automática de bases de datos y purga de caché global para reflejar cambios de marca en segundos.

---

## 8. Settings (Configuración)
Configuración global del inquilino y del perfil del socio.

```mermaid
flowchart TD
    A["Dashboard"] --> B["Modulo Configuración"]
    B --> C["Pestañas de Configuración"]
    
    C --> D["Perfil de Usuario (Nombre, Teléfono, Foto)"]
    C --> E["Dominio Personalizado (Instrucciones DNS y validación CNAME)"]
    C --> F["Integraciones (Píxeles de Meta, Google Analytics)"]
    
    E --> E1["Ingresar Dominio (ej. miempresa.com)"]
    E1 --> E2["Mostrar Registros DNS requeridos"]
    E2 -->|Verificar DNS exitoso| E3["Dominio Activo con SSL Auto-generado"]
```

### Acciones Clave:
- **Validación CNAME**: Botón interactivo para verificar en tiempo real si el socio apuntó correctamente sus DNS al servidor de PartnerHub.
