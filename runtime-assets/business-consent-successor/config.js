/**
 * Configuración del Sitio - Plantilla Maestra de Negocio & VSL
 * Ecosistema: BUSINESS
 * Compatible con PartnerHub (PH-025, PH-033 y contratos tipados)
 *
 * NOTA: Esta plantilla maestra mantiene valores neutros y genéricos para tráfico pagado.
 * Los datos de identidad, WhatsApp y el perfil businessLandingContent se inyectan por partner.
 */
const CONFIG = {
  ecosystemType: 'BUSINESS',

  // Configuración del sitio y SEO (Neutral y sin promesas de ingresos)
  site: {
    id: 'ganomaster-business',
    title: 'Modelo de Distribución Comercial — Presentación Informativa',
    appName: 'ganomaster-business',
    ogTitle: 'Desarrolla una Actividad de Venta Directa con Acompañamiento',
    ogDescription: 'Conoce cómo iniciar una actividad independiente de venta directa con acompañamiento formativo y horarios flexibles.',
    metaDescription: 'Presentación informativa sobre actividad independiente de venta directa, trabajo comercial y acompañamiento formativo.'
  },

  // Datos del Distribuidor / Líder Comercial (Inyectados dinámicamente por partner)
  distributor: {
    brandName: '',
    firstName: '',
    fullName: '',
    role: '',
    whatsappNumber: '',
    phoneNumber: '',
    displayPhone: '',
    ctaUrl: '',
    defaultMessage: ''
  },

  // Hero y Encabezado Neutral por Defecto
  hero: {
    badge: 'Actividad Comercial Independiente',
    headline: 'Desarrolla una Actividad de Venta Directa con Acompañamiento',
    subheadline: 'Conoce una propuesta de distribución independiente enfocada en autonomía, aprendizaje práctico y desarrollo de habilidades comerciales a tu propio ritmo.',
    desktopBgUrl: 'https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp',
    mobileBgUrl: 'https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp'
  },

  // Prueba Social en Hero (Desactivada por defecto hasta contar con evidencia verificada)
  socialProof: {
    enabled: false,
    headline: 'Comunidad de Aprendizaje Comercial',
    subheadline: 'Trabajo colaborativo y formación continua',
    ratingStars: '★★★★★',
    avatars: []
  },

  // Video Sales Letter (VSL) - Visible con título genérico y sin duración no validada
  vsl: {
    provider: 'custom',
    embedUrl: 'https://media.partnerhub.club/comunes/business/v2/vsl/business-vsl-pilot-v2.mp4',
    videoTitle: 'Ver presentación de negocio',
    aspectRatio: '16:9',
    caption: 'Presentación informativa · Activa el sonido para una mejor experiencia',
    thumbnailUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp',
    autoPlay: true
  },

  // Comparativa: Aprendizaje en Solitario vs Venta Directa con Acompañamiento
  comparison: {
    enabled: true,
    badge: 'Enfoque de Trabajo',
    title: '¿Por qué iniciar acompañado en lugar de hacerlo en solitario?',
    subtitle: 'Compara la experiencia de emprender una actividad comercial por cuenta propia frente a integrarte a un equipo de trabajo con guía práctica.',
    traditionalTitle: 'Inicio Comercial en Solitario',
    traditionalItems: [
      'Aprendizaje por ensayo y error sin una guía práctica estructurada.',
      'Falta de retroalimentación al organizar tus primeras presentaciones.',
      'Dificultad para planificar bloques de trabajo junto con tus estudios u ocupaciones.',
      'Diseño individual de hábitos de seguimiento y atención a clientes.'
    ],
    opportunityTitle: 'Venta Directa con Acompañamiento',
    opportunityItems: [
      'Orientación paso a paso desde el inicio para organizar tu actividad comercial.',
      'Espacios de práctica en equipo enfocados en habilidades de comunicación y servicio.',
      'Horarios adaptables a tu rutina universitaria, laboral o personal.',
      'Actividad independiente basada en la comercialización real de productos de consumo cotidiano.'
    ]
  },

  // Pilares y Beneficios del Modelo (4 Pilares neutrales por defecto)
  benefits: [
    {
      id: 'b1',
      title: 'Socio Comercial Sólido',
      description: 'Estructura comercial enfocada en el aprendizaje práctico, la organización de presentaciones y la atención ética a clientes.'
    },
    {
      id: 'b2',
      title: 'Producto de Consumo Cotidiano',
      description: 'Actividad comercial basada en bebidas de consumo diario orientadas a clientes reales y hábitos cotidianos.'
    },
    {
      id: 'b3',
      title: 'Autonomía y Horarios Flexibles',
      description: 'Organiza tu agenda semanal de forma compatible con tus estudios, actividad profesional o responsabilidades personales.'
    },
    {
      id: 'b4',
      title: 'Acompañamiento y Formación',
      description: 'Acceso a sesiones de práctica en habilidades comerciales, comunicación efectiva y herramientas digitales de seguimiento.'
    }
  ],

  // Metodología en 3 Pasos
  methodology: {
    enabled: true,
    badge: 'Metodología de Trabajo',
    title: 'Proceso de inicio en 3 pasos',
    subtitle: 'Una ruta práctica para conocer el producto, adquirir hábitos comerciales y desarrollar la actividad de forma ordenada.',
    steps: [
      {
        number: '01',
        title: 'Consume y Conecta',
        description: 'Adquieres y pruebas personalmente la línea de bebidas cotidianas para conocer sus características, preparación y presentación.'
      },
      {
        number: '02',
        title: 'Aprende en Equipo',
        description: 'Participas en espacios de orientación donde practicas cómo presentar el producto y atender consultas de forma clara y honesta.'
      },
      {
        number: '03',
        title: 'Desarrolla tu Actividad Comercial',
        description: 'Realizas gestión comercial constante con clientes y colaboradores; los resultados dependen de tu dedicación y ventas efectivas.'
      }
    ]
  },

  // Casos de Éxito / Testimonios (Desactivados por defecto hasta verificación)
  testimonials: {
    enabled: false,
    badge: 'Experiencias del Equipo',
    title: 'Experiencias en el Desarrollo Comercial',
    subtitle: 'Participantes que desarrollan la actividad comercial con acompañamiento de equipo.',
    items: []
  },

  // Preguntas Frecuentes
  faq: {
    enabled: true,
    badge: 'Preguntas Frecuentes',
    title: 'Resolvemos tus Dudas',
    subtitle: 'Respuestas claras sobre la naturaleza de la actividad comercial, la dedicación y el acompañamiento.',
    items: [
      {
        id: 'f1',
        question: '¿Necesito tener experiencia previa en ventas o negocios?',
        answer: 'No es indispensable. Contamos con acompañamiento formativo desde el inicio para que aprendas paso a paso a presentar los productos y estructurar tu trabajo comercial.'
      },
      {
        id: 'f2',
        question: '¿Cuánto tiempo debo dedicarle a la semana?',
        answer: 'Puedes empezar dedicando un mínimo de 2 horas a la semana. Si tu disponibilidad lo permite, te recomendamos entre 8 y 12 horas semanales para la formación y las actividades comerciales. La dedicación depende de tus objetivos y no garantiza resultados.'
      },
      {
        id: 'f3',
        question: '¿Cómo se originan los ingresos en esta actividad?',
        answer: 'Es una actividad independiente de venta directa. Las compensaciones dependen exclusivamente de la comercialización real de productos y del desempeño comercial individual; no es un empleo ni ofrece salario fijo.'
      },
      {
        id: 'f4',
        question: '¿Se requiere inversión inicial para comenzar?',
        answer: 'Sí. Iniciar la actividad independiente requiere una inversión para la compra inicial de producto destinado a uso personal y demostración comercial, además de trabajo constante.'
      }
    ]
  },

  // Llamados a la Acción (Solo etiquetas de intención de WhatsApp)
  cta: {
    primaryText: 'Hablar por WhatsApp',
    primaryUrl: '',
    secondaryText: 'Conocer la oportunidad',
    secondaryUrl: '',
    directRegisterUrl: '',
    guaranteeText: 'Orientación informativa directa por WhatsApp · Sin compromiso',
    headerBtnText: 'Hablar por WhatsApp'
  },

  // Tema Visual (PH-025)
  theme: {
    fontPreset: 'executive',
    palettePreset: 'cobalt-cyan'
  },

  // Textos Legales y Disclaimers
  legal: {
    disclaimer: 'Esta página presenta una actividad independiente de venta directa que requiere inversión para compra inicial de producto y trabajo comercial constante. Incluye acompañamiento formativo y no constituye una oferta de empleo ni garantiza ingresos fijos o resultados automáticos. Cualquier resultado depende del esfuerzo, dedicación y gestión comercial de cada participante.',
    privacyPolicyText: 'Al contactarnos voluntariamente por WhatsApp, usted comparte los datos que decida suministrar en su conversación para recibir información sobre la actividad comercial. Adicionalmente, cuando el sitio publicado tiene configuradas herramientas de medición como Meta Pixel, el navegador puede enviar solicitudes técnicas automáticas de visualización de página (PageView) al proveedor correspondiente.',
    termsText: 'Este sitio web es una página informativa administrada de forma independiente por un distribuidor independiente y no constituye un portal corporativo oficial.'
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
