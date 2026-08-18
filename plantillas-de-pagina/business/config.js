/**
 * Configuración del Sitio - Plantilla Maestra de Negocio
 * Ecosistema: BUSINESS
 * Compatible con PartnerHub (PH-025, PH-033 y contratos tipados)
 *
 * NOTA: Esta plantilla lee toda su información dinámicamente desde este objeto CONFIG.
 * Permite personalizar cada sección de la presentación sin tocar código HTML.
 */
const CONFIG = {
  ecosystemType: 'BUSINESS',

  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster-business',
    title: 'Conoce un modelo de negocio digital con productos de consumo diario',
    appName: 'ganomaster-business',
    ogTitle: 'Conoce un modelo de negocio digital con productos de consumo diario',
    ogDescription: 'Tienda virtual, logística corporativa y acompañamiento para evaluar la oportunidad con información completa.',
    metaDescription: 'Evaluación de oportunidad de negocio digital con productos de consumo masivo y respaldo corporativo.'
  },

  // Datos del Distribuidor / Líder Comercial
  distributor: {
    brandName: 'Sistema PartnerHub',
    firstName: 'Tu Nombre',
    fullName: 'Tu Nombre Apellido',
    role: 'Distribuidor Autorizado Independiente',
    whatsappNumber: '573000000000',
    phoneNumber: '',
    displayPhone: '',
    ctaUrl: 'https://wa.me/573000000000',
    defaultMessage: 'Hola, vi la presentación del modelo de negocio en tu página web y quiero conocer cómo iniciar.'
  },

  // Hero y Encabezado de Alto Impacto
  hero: {
    badge: 'Presentación completa de negocio',
    headline: 'Conoce un modelo de negocio digital con productos de consumo diario',
    subheadline: 'Tienda virtual, logística corporativa y acompañamiento para evaluar la oportunidad con información completa.',
    desktopBgUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    mobileBgUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
  },

  // Prueba Social en Hero (Organización & Visión)
  socialProof: {
    enabled: true,
    headline: 'Sistema de crecimiento empresarial',
    subheadline: 'Productos + tienda virtual + soporte + comunidad',
    ratingStars: '★★★★★',
    avatars: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
    ]
  },

  // Presentación Principal en Video
  vsl: {
    provider: 'custom',
    videoUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4',
    thumbnailUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp',
    videoTitle: 'Presentación del Modelo de Negocio',
    aspectRatio: '16:9',
    caption: 'Primero entiende el modelo. Luego decide si quieres una conversación personalizada.',
    durationText: 'Ver la información completa',
    autoPlay: false
  },

  // Comparativa: Modelo Tradicional vs Distribución Apalancada
  comparison: {
    enabled: true,
    badge: 'Primero el desafío',
    title: 'La mayoría no falla por falta de ganas, falla por empezar sin sistema',
    subtitle: 'Emprender suele exigir dinero, tiempo, inventario, publicidad, logística y aprendizaje comercial. Esta presentación explica una alternativa más guiada: distribución independiente apoyada en productos de consumo recurrente e infraestructura corporativa.',
    traditionalTitle: 'Cuando se emprende sin estructura',
    traditionalItems: [
      'Inversión alta antes de validar si el mercado responde.',
      'Inventario, local, despacho y soporte quedan sobre una sola persona.',
      'Se improvisa el mensaje comercial y se pierde confianza al presentar.',
      'El crecimiento depende de tiempo disponible, ubicación y contactos cercanos.'
    ],
    opportunityTitle: 'Cuando existe un sistema de apoyo',
    opportunityItems: [
      'Punto de entrada accesible para conocer el modelo con producto real.',
      'Tienda virtual, bodega y logística gestionadas por infraestructura existente.',
      'Marketing relacional, material de apoyo y acompañamiento del equipo.',
      'Posibilidad de expansión por países según reglas de la compañía y actividad personal.'
    ]
  },

  // Pilares y Beneficios del Modelo (4 Pilares en Grid)
  benefits: [
    {
      id: 'b1',
      title: 'Mercados con demanda existente',
      description: 'Café, bienestar, bebidas funcionales y cuidado personal son categorías conocidas; la conversación no parte de vender algo abstracto.'
    },
    {
      id: 'b2',
      title: 'Producto físico y recompra',
      description: 'El modelo se apoya en consumo real de productos, no en intercambio de dinero por dinero ni promesas especulativas.'
    },
    {
      id: 'b3',
      title: 'Infraestructura que reduce fricción',
      description: 'Tienda virtual, bodega, facturación y despacho ayudan a que el partner se enfoque en aprender, compartir y acompañar.'
    },
    {
      id: 'b4',
      title: 'Sistema para no avanzar solo',
      description: 'Guías, material promocional, entrenamiento, estructura de pauta y mentoría ayudan a convertir interés en acción ordenada.'
    }
  ],

  // Metodología en 3 Pasos
  methodology: {
    enabled: true,
    badge: 'Secuencia de decisión',
    title: 'Del interés a una conversación seria',
    subtitle: 'La página debe llevar a la persona por una ruta clara: entender el problema, ver el mecanismo, resolver objeciones y decidir el siguiente paso.',
    steps: [
      {
        number: '01',
        title: 'Mira la información completa',
        description: 'La presentación explica inversión, productos, tienda virtual, logística, expansión, soporte y forma de trabajo.'
      },
      {
        number: '02',
        title: 'Valida tus objeciones',
        description: 'Revisa si te hace sentido el tiempo, el acompañamiento, el tipo de producto y la forma de compartirlo.'
      },
      {
        number: '03',
        title: 'Agenda orientación',
        description: 'Si el modelo encaja, conversa por WhatsApp para recibir una guía de inicio según tu país, perfil y disponibilidad.'
      }
    ]
  },

  // Casos de Éxito / Prueba Visual
  testimonials: {
    enabled: true,
    badge: 'Prueba visual',
    title: 'Historias reales para ver el modelo desde adentro',
    subtitle: 'Escucha experiencias, aprendizajes y puntos de vista de personas que han conocido el sistema, los productos y la forma de trabajo del equipo.',
    videoCarousel: {
      items: [
        'https://media.partnerhub.club/comunes/business/v1/testimonials/business-01.mp4',
        'https://media.partnerhub.club/comunes/business/v1/testimonials/business-02.mp4',
        'https://media.partnerhub.club/comunes/business/v1/testimonials/business-03.mp4',
        'https://media.partnerhub.club/comunes/business/v1/testimonials/business-04.mp4'
      ]
    },
    items: [] // Se mantiene la propiedad vacía para compatibilidad si alguna lógica lo revisa
  },

  // Preguntas Frecuentes (Objeciones clave)
  faq: {
    enabled: true,
    badge: 'Objeciones clave',
    title: 'Antes de escribir, resuelve estas preguntas',
    subtitle: 'Las mejores páginas de decisión reducen dudas antes del contacto. Esta sección prepara una conversación más calificada por WhatsApp.',
    items: [
      {
        id: 'f1',
        question: '¿Esto garantiza dinero?',
        answer: 'No. Es una oportunidad de distribución independiente. Cualquier resultado depende de actividad, constancia, habilidades comerciales, tiempo dedicado, mercado y cumplimiento del sistema.'
      },
      {
        id: 'f2',
        question: '¿Por qué hablar de inversión accesible?',
        answer: 'Porque permite evaluar el modelo con un punto de entrada claro. La inversión no debe presentarse como garantía de retorno, sino como acceso a productos, herramientas y sistema.'
      },
      {
        id: 'f3',
        question: '¿Tengo que manejar inventario o entregas?',
        answer: 'La presentación explica la tienda virtual, bodega central y logística corporativa. Las condiciones pueden variar por país y deben aclararse antes de iniciar.'
      },
      {
        id: 'f4',
        question: '¿Qué genera urgencia real?',
        answer: 'La urgencia correcta no es prometer ganancias rápidas. Es la disponibilidad de acompañamiento, la ventana de decisión y el costo de seguir postergando una alternativa comercial seria.'
      },
      {
        id: 'f5',
        question: '¿Cuál es la decisión esperada?',
        answer: 'No es comprar por impulso. Es ver la presentación, entender el modelo y pedir orientación si realmente quieres evaluarlo con más detalle.'
      }
    ]
  },

  // Llamados a la Acción y Registro
  cta: {
    headerBtnText: 'Hablar',
    primaryText: 'Evaluar modelo',
    primaryUrl: 'https://col.ganoexcel.com/GrupoMomentumStarter',
    secondaryText: 'Preguntar',
    secondaryUrl: 'https://wa.me/573000000000',
    guaranteeText: 'Cupos de acompañamiento sujetos a disponibilidad del equipo y zona. Sin promesas de ingresos.',
    directRegisterText: 'Evaluar modelo',
    directRegisterUrl: 'https://col.ganoexcel.com/GrupoMomentumStarter'
  },

  // Decision Momentum (FOMO Seguro)
  decisionMomentum: {
    enabled: true,
    feedUrl: '', // Opcional, endpoint JSON externo
    intervalMinMs: 12000,
    intervalMaxMs: 28000,
    visibleMs: 5200,
    occasionalPauseChance: 0.22,
    occasionalPauseMinMs: 45000,
    occasionalPauseMaxMs: 90000,
    messages: [
      { label: 'Interés reciente', text: 'Una persona pasó de ver la presentación a solicitar orientación inicial.' },
      { label: 'Paso de decisión', text: 'Alguien está revisando la ruta de inicio antes de registrarse.' },
      { label: 'Movimiento del sistema', text: 'Nuevo interesado evaluando tienda virtual, productos y acompañamiento.' },
      { label: 'Avance de proceso', text: 'Una persona está resolviendo objeciones antes de tomar una decisión.' },
      { label: 'Orientación solicitada', text: 'Un interesado pidió claridad sobre inversión, productos y forma de trabajo.' },
      { label: 'Decisión informada', text: 'Alguien volvió a la presentación para revisar si el modelo encaja con su perfil.' },
      { label: 'Validación de producto', text: 'Un interesado está revisando las líneas de producto antes de avanzar.' },
      { label: 'Tienda virtual', text: 'Una persona está entendiendo cómo funciona la tienda y la logística.' },
      { label: 'Acompañamiento', text: 'Alguien está revisando qué apoyo recibe durante sus primeros pasos.' },
      { label: 'Expectativas claras', text: 'Un visitante está leyendo qué depende de su actividad y qué no está garantizado.' }
    ],
    disclaimer: 'Señales informativas del proceso. No representan ingresos ni resultados garantizados.'
  },

  // Tema Visual (PH-025)
  theme: {
    fontPreset: 'executive',
    palettePreset: 'cobalt-cyan'
  },

  // Textos Legales y Disclaimers
  legal: {
    disclaimer: 'Esta es una oportunidad de distribución independiente basada en comercialización y consumo de productos. No existen ingresos garantizados, automáticos ni universales. Los resultados dependen del esfuerzo personal, habilidades comerciales, constancia, tiempo dedicado, mercado, cumplimiento del sistema y condiciones de la compañía. La información de esta página es educativa y comercial.',
    privacyPolicyText: 'En cumplimiento de la Ley 1581 de 2012 y normas de Habeas Data, le informamos que los únicos datos recopilados son los suministrados voluntariamente al contactarnos vía WhatsApp para brindarle asesoría personalizada.',
    termsText: 'Este portal web es una vitrina informativa de negocio independiente. Los enlaces de afiliación redirigen directamente a la plataforma de inscripción corporativa oficial de la multinacional aliada bajo la Ley 1700 de 2013 en Colombia.'
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
