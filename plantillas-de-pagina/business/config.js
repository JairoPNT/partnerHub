/**
 * Configuración del Sitio - Plantilla Maestra de Negocio & VSL
 * Ecosistema: BUSINESS
 * Compatible con PartnerHub (PH-025, PH-033 y contratos tipados)
 *
 * NOTA: Esta plantilla lee toda su información dinámicamente desde este objeto CONFIG.
 * Permite personalizar cada sección del embudo de ventas sin tocar código HTML.
 */
const CONFIG = {
  ecosystemType: 'BUSINESS',

  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster-business',
    title: 'Emprende con un Modelo de Negocio Probado y Escalable — Presentación Oficial',
    appName: 'ganomaster-business',
    ogTitle: 'Construye Libertad Financiera con un Hábito Diario — Modelo de Distribución',
    ogDescription: 'Descubre cómo asociarte con un socio comercial sólido para crear una red de consumo masivo de café saludable y generar ingresos residuales.',
    metaDescription: 'Presentación oficial de la oportunidad de negocio y distribución estratégica en bienestar y consumo masivo.'
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

  // Hero y Encabezado de Alto Impacto
  hero: {
    badge: 'Oportunidad de Expansión Comercial',
    headline: 'Construye Libertad Financiera con un Hábito Diario',
    subheadline: 'Descubre cómo asociarte con un socio comercial de gran solidez para crear una red de consumo masivo de café saludable y generar ingresos residuales sostenibles.',
    desktopBgUrl: 'https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp',
    mobileBgUrl: 'https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp'
  },

  // Prueba Social en Hero (Organización & Visión)
  socialProof: {
    enabled: false,
    headline: 'Organización de Personas Libres',
    subheadline: 'Meta: 10.000 personas para el 2030',
    ratingStars: '★★★★★',
    avatars: []
  },

  // Video Sales Letter (VSL)
  vsl: {
    provider: 'custom', // 'youtube' | 'vimeo' | 'wistia' | 'custom'
    embedUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4',
    videoTitle: 'Presentación Oficial del Modelo de Negocio',
    aspectRatio: '16:9', // '16:9' | '4:3'
    caption: 'Duración aproximada: 10 minutos · Activa el sonido para mejor experiencia',
    durationText: 'Ver Presentación de Negocio (10 min)',
    thumbnailUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp',
    autoPlay: true
  },

  // Comparativa: Modelo Tradicional vs Distribución Apalancada
  comparison: {
    enabled: true,
    badge: 'El Dilema del Emprendimiento',
    title: '¿Por qué el modelo tradicional ya no es suficiente?',
    subtitle: 'Montar un negocio convencional o depender de un solo salario conlleva altos riesgos y costes fijos. El apalancamiento es la clave para la libertad en la nueva economía.',
    traditionalTitle: 'Modelo Tradicional (Empleo o PYME)',
    traditionalItems: [
      'Cambias tiempo por dinero: si no estás presente o no trabajas, no facturas.',
      'Altos costos fijos mensuales (arriendos de local, nóminas, servicios y stock).',
      'Limitación geográfica: tu mercado se restringe a tu zona o ciudad inmediata.',
      'Estrés constante por inventarios perecederos, cobranza y riesgo de capital.'
    ],
    opportunityTitle: 'Modelo de Distribución Apalancado',
    opportunityItems: [
      'Ingresos residuales continuos: generas comisiones cada vez que alguien toma café.',
      'Cero inventarios ni nóminas: la compañía multinacional asume 100% de la operación.',
      'Negocio global y escalable: expande tu red de consumo en más de 10 países de América.',
      'Plan de formación integral y mentoría de equipo incluida desde el primer día sin costo.'
    ]
  },

  // Pilares y Beneficios del Modelo (4 Pilares en Grid)
  benefits: [
    {
      id: 'b1',
      title: 'Socio Comercial Sólido',
      description: 'Multinacional fundada en 1995 con presencia en más de 70 países. Opera con sedes corporativas propias, respaldo legal bajo la Ley 1700 de 2013 y solidez financiera.'
    },
    {
      id: 'b2',
      title: 'Hábito de Consumo Masivo',
      description: 'Café, té y chocolate enriquecidos con extracto 100% soluble de Ganoderma Lucidum. Productos de alta rotación diaria y retención natural sin ventas forzadas.'
    },
    {
      id: 'b3',
      title: 'Operación & Logística Cubierta',
      description: 'La compañía multinacional se encarga de las importaciones, registros sanitarios INVIMA, almacenamiento, facturación y despacho directo a domicilio.'
    },
    {
      id: 'b4',
      title: 'Mentoría & Sistema Educativo',
      description: 'Acompañamiento paso a paso con el sistema de duplicación del equipo. Acceso a plataformas digitales, entrenamientos semanales y liderazgo empresarial.'
    }
  ],

  // Metodología en 3 Pasos
  methodology: {
    enabled: true,
    badge: 'Metodología de Trabajo',
    title: 'Tu camino en 3 sencillos pasos',
    subtitle: 'Un sistema duplicable y comprobado diseñado para que comiences a generar resultados desde las primeras semanas de integración.',
    steps: [
      {
        number: '01',
        title: 'Consume y Conecta',
        description: 'Te registras en la compañía, seleccionas tus productos para consumo personal y familiar, y validas personalmente sus beneficios en energía y bienestar integral.'
      },
      {
        number: '02',
        title: 'Capacítate en Equipo',
        description: 'Te integras a nuestras sesiones de mentoría y entrenamiento digital. Aprendes a presentar profesionalmente la oportunidad y a utilizar herramientas de prospección.'
      },
      {
        number: '03',
        title: 'Expande y Gana',
        description: 'Construyes una comunidad de socios y clientes en diferentes ciudades. Recibes comisiones semanales y regalías residuales basadas en el volumen de consumo de tu red.'
      }
    ]
  },

  // Casos de Éxito / Testimonios Reales
  testimonials: {
    enabled: false,
    badge: 'Casos de Éxito',
    title: 'Historias de Éxito en Nuestro Equipo',
    subtitle: 'Emprendedores reales que tomaron la decisión de construir su libertad financiera con nuestro sistema de apalancamiento.',
    items: []
  },

  // Preguntas Frecuentes (Manejo de Objeciones)
  faq: {
    enabled: true,
    badge: 'Preguntas Frecuentes',
    title: 'Resolvemos tus Dudas',
    subtitle: 'Respuestas claras a las preguntas más comunes sobre el modelo de negocio, tiempos y sistema de comisiones.',
    items: [
      {
        id: 'f1',
        question: '¿Necesito tener experiencia previa en ventas o negocios?',
        answer: 'No. La gran mayoría de personas en nuestro equipo comenzaron sin experiencia comercial previa. Contamos con un sistema educativo estructurado y mentoría continua que te enseña paso a paso desde el primer día cómo posicionar la marca de forma profesional.'
      },
      {
        id: 'f2',
        question: '¿Cuánto tiempo debo dedicarle a la semana?',
        answer: 'El modelo está diseñado para desarrollarse a tiempo parcial (8 a 12 horas por semana) de manera flexible, permitiéndote construir una fuente secundaria de ingresos sin abandonar tu empleo, profesión o negocio actual.'
      },
      {
        id: 'f3',
        question: '¿Cómo se generan las comisiones y cuándo se pagan?',
        answer: 'Las comisiones se generan por el volumen de producto que se mueve en tu red (a través de consumo personal, clientes preferenciales y nuevos distribuidores). La compañía realiza liquidaciones semanales y deposita directamente en tu cuenta bancaria.'
      },
      {
        id: 'f4',
        question: '¿Tengo que endeudarme o acumular grandes inventarios en casa?',
        answer: 'Absolutamente no. Este modelo no requiere bodegaje ni compra excesiva de inventarios. Te asocias con una compra inicial de producto para tu consumo y muestras, y la multinacional se encarga de la logística y envíos para tus clientes y socios.'
      }
    ]
  },

  // Llamados a la Acción y Registro
  cta: {
    primaryText: 'Quiero Participar y Registrarme',
    primaryUrl: '',
    secondaryText: 'Más Información por WhatsApp',
    secondaryUrl: '',
    guaranteeText: 'Cupos limitados por zona para acompañamiento personalizado.',
    directRegisterText: 'Quiero Participar y Registrarme',
    directRegisterUrl: ''
  },

  // Tema Visual (PH-025)
  theme: {
    fontPreset: 'executive',
    palettePreset: 'cobalt-cyan'
  },

  // Textos Legales y Disclaimers
  legal: {
    disclaimer: 'Descargo de Responsabilidad: La empresa aliada provee productos registrados y legalizados ante las entidades de salud de cada país en donde opera (INVIMA, FDA, etc.). El negocio de distribución independiente se sustenta estrictamente en el movimiento real de productos mediante consumo y comercialización; bajo ninguna circunstancia se intercambia dinero por dinero. Los resultados financieros, de libertad de tiempo y de crecimiento empresarial mencionados en esta página representan metas y proyecciones basadas en la experiencia práctica y no constituyen garantías de ingresos automáticos. El éxito en este proyecto depende al 100% del esfuerzo personal, la constancia, el liderazgo y la dedicación de cada participante. El acompañamiento, mentorías y sistemas educativos se ofrecen como guías prácticas desde la experiencia en el desarrollo del negocio.',
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
