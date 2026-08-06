/**
 * Configuración del Sitio - Plantilla de Marca Personal
 * Ecosistema: PERSONAL_BRAND
 * Fuente maestra por defecto: ganomaster-personal-brand
 * Compatible con inyección dinámica de PartnerHub (PH-025 y PH-033)
 */
const CONFIG = {
  ecosystemType: 'PERSONAL_BRAND',

  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster-personal-brand',
    title: 'Líder de Bienestar & Mentor Comercial',
    appName: 'ganomaster-personal-brand',
    ogTitle: 'Líder de Bienestar & Mentor Comercial — Hub Oficial',
    ogDescription: 'Bienvenido a mi espacio oficial: proyectos, mentorías, recursos y acceso directo a mi comunidad.',
    metaDescription: 'Espacio profesional de mentoría, proyectos de bienestar y conexión directa con empresarios.'
  },

  // Perfil Principal
  profile: {
    brandName: 'Marca Personal',
    fullName: 'Nombre del Profesional',
    headline: 'Emprendedor, Mentor de Bienestar & Estratega de Negocios',
    bio: 'Ayudo a personas y equipos a desbloquear su potencial combinando salud integral, hábitos conscientes y desarrollo de negocios escalables.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    location: 'Colombia & Internacional',
    badge: 'Mentor Verificado'
  },

  // Bloques Modulares Activables
  blocks: {
    profileBlock: {
      enabled: true
    },
    bioBlock: {
      enabled: true,
      quote: 'El verdadero liderazgo no consiste en crear seguidores, sino en inspirar a nuevos líderes a transformar su entorno.',
      experienceText: '+8 años liderando organizaciones comerciales y proyectos de salud adaptógena.'
    },
    servicesBlock: {
      enabled: true,
      title: 'Proyectos & Mentorías',
      subtitle: 'Áreas en las que colaboro activamente',
      items: [
        {
          id: 's1',
          title: 'Mentoría 1-a-1 en Liderazgo',
          description: 'Acompañamiento personalizado para estructurar metas comerciales y liderazgo de equipos.',
          badge: 'Cupos Limitados',
          ctaText: 'Consultar Disponibilidad',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 's2',
          title: 'Expansión de Red Comercial',
          description: 'Únete a mi equipo de distribución internacional en la industria del bienestar.',
          badge: 'Oportunidad',
          ctaText: 'Postularme',
          ctaUrl: 'https://wa.me/573000000000'
        }
      ]
    },
    linksBlock: {
      enabled: true,
      title: 'Enlaces & Canales Oficiales',
      subtitle: 'Conéctate conmigo en mis diferentes plataformas',
      items: [
        {
          id: 'l1',
          label: 'Canal de WhatsApp Oficial',
          url: 'https://wa.me/573000000000',
          category: 'COMMUNITY',
          featured: true
        },
        {
          id: 'l2',
          label: 'Instagram Profesional',
          url: 'https://instagram.com',
          category: 'SOCIAL'
        },
        {
          id: 'l3',
          label: 'Página de Productos & Bienestar',
          url: 'https://ganomaster.pro',
          category: 'RESOURCE'
        }
      ]
    },
    eventsBlock: {
      enabled: true,
      title: 'Próximos Eventos & Webinars',
      subtitle: 'Sesiones en vivo y encuentros presenciales',
      items: [
        {
          id: 'e1',
          date: 'Jueves 8:00 PM (GMT-5)',
          title: 'Masterclass: Hábitos y Negocio en la Nueva Economía',
          location: 'Sesión Virtual en Vivo',
          ctaText: 'Reservar Cupo',
          ctaUrl: 'https://wa.me/573000000000'
        }
      ]
    },
    contactBlock: {
      enabled: true,
      title: '¿Listo para conectar?',
      whatsappNumber: '573000000000',
      email: 'contacto@dominio.com',
      ctaText: 'Conversar Directamente por WhatsApp',
      defaultMessage: 'Hola, visité tu Hub de Marca Personal y me interesa conectar contigo.'
    }
  },

  // Tema Visual (PH-025)
  theme: {
    fontPreset: 'modern',
    palettePreset: 'cobalt-cyan'
  },

  // Integraciones Opcionales
  analytics: {
    measurementId: ''
  }
};

// Hacer disponible globalmente en el navegador
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
