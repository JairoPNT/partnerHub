/**
 * Configuración del Sitio - Plantilla Maestra de Negocio & VSL
 * Ecosistema: BUSINESS
 * Compatible con PartnerHub (PH-025, PH-033 y contratos tipados)
 *
 * NOTA: Esta plantilla lee toda su información dinámicamente desde este objeto CONFIG.
 * No contiene datos de contacto privados ni hardcodeados.
 */
const CONFIG = {
  ecosystemType: 'BUSINESS',

  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster-business',
    title: 'Emprende con un Modelo de Negocio Probado y Escalable',
    appName: 'ganomaster-business',
    ogTitle: 'Emprende con un Modelo de Negocio Probado y Escalable',
    ogDescription: 'Descubre cómo construir un negocio de bienestar sostenible apalancado en un sistema validado.',
    metaDescription: 'Presentación oficial de la oportunidad de negocio y distribución estratégica en bienestar integral.'
  },

  // Datos del Distribuidor / Líder Comercial
  distributor: {
    brandName: 'Líder de Negocio',
    firstName: 'Empresario',
    fullName: 'Empresario Asociado',
    role: 'Líder de Expansión & Distribución',
    whatsappNumber: '573000000000',
    phoneNumber: '',
    displayPhone: '',
    ctaUrl: 'https://wa.me/573000000000',
    defaultMessage: 'Hola, vi la presentación de negocio en tu página web y quiero conocer cómo iniciar.'
  },

  // Hero y Encabezado de Alto Impacto
  hero: {
    badge: 'Oportunidad de Expansión Comercial',
    headline: 'Construye un Negocio Sólido Apalancado en Bienestar y Consumo Masivo',
    subheadline: 'Mira el video completo para conocer el sistema de distribución, márgenes de ganancia y plan de expansión internacional.',
    desktopBgUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    mobileBgUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
  },

  // Video Sales Letter (VSL)
  vsl: {
    provider: 'youtube', // 'youtube' | 'vimeo' | 'wistia' | 'custom'
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    videoTitle: 'Presentación Oficial del Modelo de Negocio',
    aspectRatio: '16:9', // '16:9' | '4:3'
    caption: 'Duración aproximada: 10 minutos · Activa el sonido para mejor experiencia',
    autoPlay: false
  },

  // Pilares y Beneficios del Modelo (Hasta 4 items)
  benefits: [
    {
      id: 'b1',
      title: 'Hábito de Consumo Masivo',
      description: 'Productos de alta rotación diaria y retención natural (café, té y chocolate saludable) sin ventas agresivas.'
    },
    {
      id: 'b2',
      title: 'Infraestructura & Logística Resuelta',
      description: 'Una corporación multinacional respalda el inventario, sedes físicas, facturación y envíos a domicilio.'
    },
    {
      id: 'b3',
      title: 'Sistema de Mentoría y Duplicación',
      description: 'Capacitación paso a paso desde el primer día con herramientas digitales validadas y acompañamiento en equipo.'
    },
    {
      id: 'b4',
      title: 'Ingresos Residuales y Escalables',
      description: 'Genera comisiones recurrentes basadas en el volumen de consumo de tu red en múltiples países de América.'
    }
  ],

  // Llamado a la Acción Principal
  cta: {
    primaryText: 'Agendar Sesión de Evaluación',
    primaryUrl: 'https://wa.me/573000000000',
    secondaryText: 'Conocer Más Detalles',
    secondaryUrl: '#beneficios',
    guaranteeText: 'Cupos limitados por zona para acompañamiento personalizado.'
  },

  // Tema Visual (PH-025)
  theme: {
    fontPreset: 'executive',
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
