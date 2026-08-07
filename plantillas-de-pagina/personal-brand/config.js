/**
 * Configuración del Sitio - Plantilla Maestra de Marca Personal
 * Ecosistema: PERSONAL_BRAND
 * Compatible con PartnerHub (PH-025, PH-033 y contratos tipados)
 *
 * NOTA: Esta plantilla lee toda su información dinámicamente desde este objeto CONFIG.
 * No contiene datos personales reales hardcodeados.
 */
const CONFIG = {
  ecosystemType: 'PERSONAL_BRAND',

  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster-personal-brand',
    title: 'Líder de Bienestar & Mentor Comercial — Hub Oficial',
    appName: 'ganomaster-personal-brand',
    ogTitle: 'Líder de Bienestar & Mentor Comercial — Portal Oficial',
    ogDescription: 'Bienvenido a mi espacio oficial: proyectos de bienestar, mentorías estratégicas, agenda de eventos y contacto directo.',
    metaDescription: 'Portal profesional y hub de marca personal. Mentoría ejecutiva, proyectos de salud adaptógena y expansión de redes comerciales.'
  },

  // Perfil Principal y Hero
  profile: {
    brandName: 'Marca Personal',
    fullName: 'Nombre del Profesional',
    headline: 'Liderazgo · Consultoría · Emprendimiento Inteligente',
    subheadline: 'Formando empresarios y acompañando procesos de transformación en salud e ingresos residuales.',
    bio: 'Bienvenido a mi portal empresarial. Aquí podrás agendar asesorías personalizadas, acceder al calendario de reuniones programadas, solicitar seguimiento de tu proceso y conectar en mis canales oficiales.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    location: 'Colombia & Internacional',
    badge: 'Mentor Verificado'
  },

  // Bloques Modulares Activables
  blocks: {
    // 1. Bloque de Perfil / Hero
    profileBlock: {
      enabled: true
    },

    // 2. Bloque de Biografía y Propósito de Liderazgo
    bioBlock: {
      enabled: true,
      quote: 'El verdadero liderazgo no consiste en crear seguidores, sino en inspirar a nuevos líderes a transformar su entorno con salud, visión y libertad financiera.',
      experienceText: '+8 años liderando organizaciones comerciales y proyectos de salud adaptógena.',
      purposeTitle: 'Propósito de Liderazgo',
      purposeDescription: 'Desarrollo sistemas duplicables de crecimiento personal, bienestar preventivo e ingresos residuales con una visión clara de impacto sostenible.'
    },

    // 3. Bloque de Proyectos / Mentorías (Máximo 4 items)
    servicesBlock: {
      enabled: true,
      title: 'Proyectos & Mentorías',
      subtitle: 'Áreas en las que colaboro activamente y acompaño a líderes',
      items: [
        {
          id: 's1',
          title: 'Mentoría Ejecutiva 1-a-1',
          description: 'Capacitación y formación práctica para emprendedores que buscan construir redes de distribución sólidas y residuales.',
          badge: 'Cupos Limitados',
          ctaText: 'Solicitar Asesoría',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 's2',
          title: 'Salud & Longevidad Adaptógena',
          description: 'Promoción de la nutrición inteligente con Ganoderma Lucidum como hábito diario de prevención, vitalidad y equilibrio metabólico.',
          badge: 'Bienestar',
          ctaText: 'Conocer Productos',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 's3',
          title: 'Expansión de Red Comercial',
          description: 'Únete a mi equipo de distribución internacional en la industria del café saludable con respaldo logístico de multinacional.',
          badge: 'Oportunidad',
          ctaText: 'Postularme al Equipo',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 's4',
          title: 'Acompañamiento & Seguimiento',
          description: 'Planes de acción estructurados y sesiones periódicas de revisión de metas para socios y consumidores activos.',
          badge: 'Exclusivo',
          ctaText: 'Agendar Revisión',
          ctaUrl: 'https://wa.me/573000000000'
        }
      ]
    },

    // 4. Bloque de Enlaces y Canales Oficiales (Máximo 8 items)
    linksBlock: {
      enabled: true,
      title: 'Enlaces & Canales Oficiales',
      subtitle: 'Conéctate conmigo en mis diferentes plataformas y comunidades',
      items: [
        {
          id: 'l1',
          label: 'WhatsApp Oficial Directo',
          url: 'https://wa.me/573000000000',
          category: 'COMMUNITY',
          featured: true
        },
        {
          id: 'l2',
          label: 'Portal de Productos & Bienestar',
          url: 'https://product.ganomaster.pro',
          category: 'RESOURCE',
          featured: true
        },
        {
          id: 'l3',
          label: 'Presentación de Negocio & VSL',
          url: 'https://business.ganomaster.pro',
          category: 'RESOURCE'
        },
        {
          id: 'l4',
          label: 'Instagram Profesional',
          url: 'https://instagram.com',
          category: 'SOCIAL'
        },
        {
          id: 'l5',
          label: 'Canal de TikTok',
          url: 'https://tiktok.com',
          category: 'SOCIAL'
        },
        {
          id: 'l6',
          label: 'Perfil Profesional de LinkedIn',
          url: 'https://linkedin.com',
          category: 'SOCIAL'
        }
      ]
    },

    // 5. Bloque de Eventos & Agenda Activa (Máximo 6 items)
    eventsBlock: {
      enabled: true,
      title: 'Calendario de Reuniones & Eventos',
      subtitle: 'Participa en nuestras próximas sesiones de capacitación, webinars e interacciones en vivo',
      items: [
        {
          id: 'e1',
          date: 'Martes · 8:00 PM (GMT-5)',
          title: 'Masterclass: Ingresos Residuales en la Era Digital',
          location: 'Sesión Virtual vía Zoom · Orientación de Negocio & Liderazgo',
          ctaText: 'Reservar Cupo',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 'e2',
          date: 'Jueves · 7:30 PM (GMT-5)',
          title: 'Seminario de Salud Integral & Ganoderma Lucidum',
          location: 'Conferencia en Vivo · Ciencia, beneficios y hábitos preventivos',
          ctaText: 'Reservar Cupo',
          ctaUrl: 'https://wa.me/573000000000'
        },
        {
          id: 'e3',
          date: 'Sábado · 10:00 AM (GMT-5)',
          title: 'Entrenamiento de Equipo & Plan de Acción',
          location: 'Exclusivo para Socios de la Organización · Planificación y Duplicación',
          ctaText: 'Acceso Socios',
          ctaUrl: 'https://wa.me/573000000000'
        }
      ]
    },

    // 6. Bloque de Contacto & Solicitud de Asesoría
    contactBlock: {
      enabled: true,
      title: 'Solicitud de Asesoría Personalizada',
      subtitle: 'Elige el tipo de sesión que requieres y coordinemos de forma directa fecha y hora de reunión:',
      whatsappNumber: '573000000000',
      email: 'contacto@dominio.com',
      ctaText: 'Escribir para Agendar Cita',
      defaultMessage: 'Hola, visité tu Hub de Marca Personal y me gustaría solicitar una cita de asesoría personalizada.'
    }
  },

  // Tema Visual PH-025 (Preset tipográfico y paleta de color)
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
