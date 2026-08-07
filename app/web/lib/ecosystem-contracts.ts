/**
 * ecosystem-contracts.ts
 * Contratos de plantillas tipados y normalizados para los 3 ecosistemas de PartnerHub:
 * 1. PRODUCT: Landing comercial de productos adaptógenos.
 * 2. BUSINESS: Landing de oportunidad de negocio / VSL (Video Sales Letter).
 * 3. PERSONAL_BRAND: Hub de Marca Personal modular y estructurado.
 *
 * Cumple con PH-025 (Temas visuales) y PH-033 (Contrato Backend Multi-Ecosistema).
 */

import { FontPreset, PalettePreset, FONT_PRESETS, PALETTE_PRESETS, getFontPresetMeta, getPalettePresetMeta } from "./theme-presets";

export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export const ECOSYSTEM_NAMES: Record<EcosystemType, string> = {
  PRODUCT: "Página de Producto",
  BUSINESS: "Negocio & VSL",
  PERSONAL_BRAND: "Marca Personal"
};

export const MASTER_SITE_IDS: Record<EcosystemType, string> = {
  PRODUCT: "ganomaster",
  BUSINESS: "ganomaster-business",
  PERSONAL_BRAND: "ganomaster-personal-brand"
};

export const SHOWCASE_SITE_ID = "ganomaster-showcase";
export const SHOWCASE_DOMAIN = "ganomaster.pro";

export const MASTER_SITE_DOMAINS: Record<EcosystemType, string> = {
  PRODUCT: "product.ganomaster.pro",
  BUSINESS: "business.ganomaster.pro",
  PERSONAL_BRAND: "brand.ganomaster.pro"
};

export const CANONICAL_URLS: Record<EcosystemType | "SHOWCASE", string> = {
  PRODUCT: "https://product.ganomaster.pro",
  BUSINESS: "https://business.ganomaster.pro",
  PERSONAL_BRAND: "https://brand.ganomaster.pro",
  SHOWCASE: "https://ganomaster.pro"
};

// ==========================================
// 1. CONTRATO: BUSINESS / VSL
// ==========================================

export interface BusinessBenefitItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface BusinessTestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
}

export interface BusinessFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BusinessStepItem {
  number: string;
  title: string;
  description: string;
}

export interface BusinessTemplateConfig {
  ecosystemType: "BUSINESS";
  site: {
    id: string;
    domain?: string;
    title: string;
    appName: string;
    ogTitle: string;
    ogDescription: string;
    metaDescription: string;
  };
  distributor: {
    brandName: string;
    firstName: string;
    fullName: string;
    role: string;
    whatsappNumber: string;
    phoneNumber?: string;
    displayPhone?: string;
    ctaUrl: string;
    defaultMessage: string;
  };
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    desktopBgUrl?: string;
    mobileBgUrl?: string;
  };
  vsl: {
    provider: "youtube" | "vimeo" | "wistia" | "custom";
    embedUrl: string;
    videoTitle?: string;
    aspectRatio: "16:9" | "4:3";
    caption?: string;
    autoPlay?: boolean;
    thumbnailUrl?: string;
    durationText?: string;
  };
  socialProof?: {
    enabled?: boolean;
    avatars?: string[];
    headline?: string;
    subheadline?: string;
    ratingStars?: string;
  };
  comparison?: {
    enabled?: boolean;
    badge?: string;
    title?: string;
    subtitle?: string;
    traditionalTitle?: string;
    traditionalItems?: string[];
    opportunityTitle?: string;
    opportunityItems?: string[];
  };
  benefits: BusinessBenefitItem[];
  methodology?: {
    enabled?: boolean;
    badge?: string;
    title?: string;
    subtitle?: string;
    steps?: BusinessStepItem[];
  };
  testimonials?: {
    enabled?: boolean;
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: BusinessTestimonialItem[];
  };
  faq?: {
    enabled?: boolean;
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: BusinessFaqItem[];
  };
  cta: {
    primaryText: string;
    primaryUrl: string;
    secondaryText?: string;
    secondaryUrl?: string;
    guaranteeText?: string;
    directRegisterText?: string;
    directRegisterUrl?: string;
  };
  theme: {
    fontPreset: FontPreset;
    palettePreset: PalettePreset;
  };
  legal?: {
    disclaimer?: string;
    privacyPolicyText?: string;
    termsText?: string;
  };
  analytics?: {
    measurementId?: string;
  };
}

// ==========================================
// 2. CONTRATO: PERSONAL BRAND
// ==========================================

export const PERSONAL_BRAND_LIMITS = {
  MAX_SERVICES: 4,
  MAX_LINKS: 8,
  MAX_EVENTS: 6
} as const;

export interface PersonalServiceItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  ctaUrl?: string;
  ctaText?: string;
}

export interface PersonalLinkItem {
  id: string;
  label: string;
  url: string;
  category?: "SOCIAL" | "RESOURCE" | "COMMUNITY" | "EXTERNAL";
  icon?: string;
  featured?: boolean;
}

export interface PersonalEventItem {
  id: string;
  date: string;
  title: string;
  location: string;
  ctaUrl: string;
  ctaText: string;
}

export interface PersonalBrandTemplateConfig {
  ecosystemType: "PERSONAL_BRAND";
  site: {
    id: string;
    domain?: string;
    title: string;
    appName: string;
    ogTitle: string;
    ogDescription: string;
    metaDescription: string;
  };
  profile: {
    brandName: string;
    fullName: string;
    headline: string;
    bio: string;
    avatarUrl: string;
    coverUrl?: string;
    location?: string;
    badge?: string;
  };
  blocks: {
    profileBlock: {
      enabled: boolean;
    };
    bioBlock: {
      enabled: boolean;
      quote?: string;
      experienceText?: string;
    };
    servicesBlock: {
      enabled: boolean;
      title: string;
      subtitle?: string;
      items: PersonalServiceItem[]; // Máximo 4
    };
    linksBlock: {
      enabled: boolean;
      title: string;
      subtitle?: string;
      items: PersonalLinkItem[]; // Máximo 8
    };
    eventsBlock: {
      enabled: boolean;
      title: string;
      subtitle?: string;
      items: PersonalEventItem[]; // Máximo 6
    };
    contactBlock: {
      enabled: boolean;
      title: string;
      whatsappNumber: string;
      email?: string;
      ctaText: string;
      defaultMessage: string;
    };
  };
  theme: {
    fontPreset: FontPreset;
    palettePreset: PalettePreset;
  };
  analytics?: {
    measurementId?: string;
  };
}

// ==========================================
// 3. DEFAULTS GENÉRICOS (SIN DATOS DE CLIENTES REALES)
// ==========================================

export const DEFAULT_BUSINESS_CONFIG: BusinessTemplateConfig = {
  ecosystemType: "BUSINESS",
  site: {
    id: "ganomaster-business",
    title: "Emprende con un Modelo de Negocio Probado y Escalable",
    appName: "ganomaster-business",
    ogTitle: "Emprende con un Modelo de Negocio Probado y Escalable",
    ogDescription: "Descubre cómo construir un negocio de bienestar sostenible apalancado en un sistema validado.",
    metaDescription: "Presentación oficial de la oportunidad de negocio y distribución estratégica en bienestar integral."
  },
  distributor: {
    brandName: "Líder de Negocio",
    firstName: "Empresario",
    fullName: "Empresario Asociado",
    role: "Líder de Expansión & Distribución",
    whatsappNumber: "573000000000",
    ctaUrl: "https://wa.me/573000000000",
    defaultMessage: "Hola, vi la presentación de negocio en tu página web y quiero conocer cómo iniciar."
  },
  hero: {
    badge: "Oportunidad de Expansión Comercial",
    headline: "Construye Libertad Financiera con un Hábito Diario",
    subheadline: "Descubre cómo asociarte con un socio comercial de gran solidez para crear una red de consumo masivo de café saludable y generar ingresos residuales.",
    desktopBgUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    mobileBgUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
  },
  vsl: {
    provider: "youtube",
    embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    videoTitle: "Presentación Oficial del Modelo de Negocio",
    aspectRatio: "16:9",
    caption: "Duración aproximada: 10 minutos · Activa el sonido para mejor experiencia",
    durationText: "Ver Presentación de Negocio (10 min)"
  },
  socialProof: {
    enabled: true,
    headline: "Organización de Personas Libres",
    subheadline: "Meta: 10.000 personas para el 2030",
    ratingStars: "★★★★★"
  },
  comparison: {
    enabled: true,
    badge: "El Dilema del Emprendimiento",
    title: "¿Por qué el modelo tradicional ya no es suficiente?",
    subtitle: "Montar un negocio o depender de un solo salario tiene grandes riesgos. El apalancamiento es la clave del siglo XXI.",
    traditionalTitle: "Modelo Tradicional (Empleo o PYME)",
    traditionalItems: [
      "Cambias tiempo por dinero. Si no trabajas, no facturas.",
      "Altos costos fijos mensuales (arriendo, nómina, servicios, stock).",
      "Limitación geográfica. Tu mercado se restringe a tu zona o ciudad.",
      "Estrés constante por inventarios y cobro a clientes."
    ],
    opportunityTitle: "Modelo de Distribución Apalancado",
    opportunityItems: [
      "Ingresos residuales: sigues ganando cada vez que alguien toma café.",
      "Cero inventarios ni nómina. La multinacional asume toda la operación.",
      "Negocio global. Puedes expandir tu red de consumo internacionalmente.",
      "Plan de formación y mentoría de equipo incluido sin costo."
    ]
  },
  benefits: [
    {
      id: "b1",
      title: "Socio Comercial Sólido",
      description: "Multinacional fundada en 1995 presente en más de 70 países. Opera con sedes corporativas propias y respaldo legal."
    },
    {
      id: "b2",
      title: "Hábito de Consumo Masivo",
      description: "Café, té y chocolate enriquecidos con Ganoderma Lucidum. Productos de consumo diario con retención natural."
    },
    {
      id: "b3",
      title: "Operación & Logística Cubierta",
      description: "La compañía asume inventarios, registros sanitarios, aduanas, facturación y envíos a domicilio al consumidor."
    },
    {
      id: "b4",
      title: "Mentoría & Sistema Educativo",
      description: "Acompañamiento paso a paso, herramientas digitales y capacitaciones continuas para desarrollar tu liderazgo."
    }
  ],
  methodology: {
    enabled: true,
    badge: "Metodología de Trabajo",
    title: "Tu camino en 3 sencillos pasos",
    subtitle: "Un sistema duplicable y sencillo diseñado para que obtengas resultados desde las primeras semanas.",
    steps: [
      {
        number: "01",
        title: "Consume y Conecta",
        description: "Te registras en la compañía, seleccionas tus productos para uso personal y familiar, y compruebas sus beneficios en bienestar."
      },
      {
        number: "02",
        title: "Capacítate en Equipo",
        description: "Te integras de forma gratuita al sistema de mentoría. Aprendes a presentar profesionalmente y a utilizar herramientas digitales."
      },
      {
        number: "03",
        title: "Expande y Gana",
        description: "Construyes una comunidad de socios y clientes. Recibes comisiones semanales basadas en el volumen de consumo de tu red."
      }
    ]
  },
  testimonials: {
    enabled: true,
    badge: "Casos de Éxito",
    title: "Historias de Éxito en Nuestro Equipo",
    subtitle: "Emprendedores reales que tomaron la decisión de construir su libertad financiera con nuestro sistema.",
    items: [
      {
        id: "t1",
        name: "Diana Ramos",
        role: "Socio de Negocio · Cali",
        quote: "Emprender siempre me dio miedo por las deudas y los costos fijos. Con este modelo inteligente he construido un ingreso residual estable que supera mi antiguo sueldo profesional, manejando mi propio tiempo."
      },
      {
        id: "t2",
        name: "Carlos Mendoza",
        role: "Empresario Asociado · Bogotá",
        quote: "Tenía un negocio tradicional de calzado con jornadas extenuantes. Decidí diversificar con el café saludable y en menos de un año creé una red de consumo que genera ingresos automáticos semanales."
      }
    ]
  },
  faq: {
    enabled: true,
    badge: "Preguntas Frecuentes",
    title: "Resolvemos tus Dudas",
    subtitle: "Respuestas claras sobre cómo funciona el modelo de distribución y el sistema de trabajo.",
    items: [
      {
        id: "f1",
        question: "¿Necesito tener experiencia previa en ventas o negocios?",
        answer: "No. Contamos con un sistema de mentoría y capacitaciones semanales que te guiarán paso a paso desde el primer día, sin importar tu profesión o experiencia previa."
      },
      {
        id: "f2",
        question: "¿Cuánto tiempo debo dedicarle a la semana?",
        answer: "El modelo está diseñado para desarrollarse a tiempo parcial (8 a 12 horas por semana) mientras mantienes tu empleo, profesión o negocio actual."
      },
      {
        id: "f3",
        question: "¿Cómo se generan las comisiones y cuándo se pagan?",
        answer: "Las comisiones se generan por el volumen de producto consumido y distribuido en tu red y se pagan semanalmente de forma directa a tu cuenta bancaria."
      },
      {
        id: "f4",
        question: "¿Tengo que endeudarme o acumular grandes inventarios?",
        answer: "No. El modelo se basa en el consumo personal y la recomendación directa. La multinacional asume el stock, logística y despachos a domicilio de los clientes."
      }
    ]
  },
  cta: {
    primaryText: "Agendar Sesión de Evaluación",
    primaryUrl: "https://wa.me/573000000000",
    secondaryText: "Conocer Más Detalles",
    secondaryUrl: "#beneficios",
    guaranteeText: "Cupos limitados por zona para acompañamiento personalizado.",
    directRegisterText: "Quiero Participar y Registrarme",
    directRegisterUrl: "https://col.ganoexcel.com/GrupoMomentumStarter"
  },
  theme: {
    fontPreset: "executive",
    palettePreset: "cobalt-cyan"
  },
  legal: {
    disclaimer: "La empresa aliada provee un producto registrado y legalizado en cada país donde opera. La oportunidad de negocio se sustenta estrictamente en el movimiento de producto mediante consumo y comercialización real; bajo ninguna circunstancia se cambia dinero por dinero. Los resultados financieros y de crecimiento compartidos en este sitio representan metas y proyecciones basadas en la experiencia práctica y no constituyen garantías de ingresos automáticos. El éxito depende al 100% del esfuerzo personal, la disciplina y la dedicación de cada participante."
  }
};

export const DEFAULT_PERSONAL_BRAND_CONFIG: PersonalBrandTemplateConfig = {
  ecosystemType: "PERSONAL_BRAND",
  site: {
    id: "ganomaster-personal-brand",
    title: "Líder de Bienestar & Mentor Comercial",
    appName: "ganomaster-personal-brand",
    ogTitle: "Líder de Bienestar & Mentor Comercial",
    ogDescription: "Acompañamiento estratégico en salud holística, liderazgo de equipos y emprendimiento con Ganoderma Lucidum.",
    metaDescription: "Hub de marca personal con biografía, servicios de mentoría, canales oficiales y agenda de eventos."
  },
  profile: {
    brandName: "Líder de Bienestar",
    fullName: "Nombre del Profesional",
    headline: "Líder de Expansión & Mentor Comercial",
    bio: "Más de 8 años guiando a personas y familias a transformar su salud mediante nutrición funcional y a construir ingresos residuales sólidos con un modelo de distribución comprobado.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    coverUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
    location: "Colombia · Expansión Internacional",
    badge: "Mentor Autorizado"
  },
  blocks: {
    profileBlock: {
      enabled: true
    },
    bioBlock: {
      enabled: true,
      quote: "El bienestar verdadero combina vitalidad física, tranquilidad mental y la libertad financiera para vivir bajo tus propios términos.",
      experienceText: "+8 años guiando a familias y líderes en bienestar integral y desarrollo de negocios."
    },
    servicesBlock: {
      enabled: true,
      title: "Proyectos & Mentorías",
      subtitle: "Acompañamiento personalizado en bienestar, hábitos saludables y liderazgo comercial.",
      items: [
        {
          id: "srv-1",
          title: "Mentoría de Negocio & Expansión",
          description: "Acompañamiento 1-a-1 para emprendedores que desean construir ingresos residuales distribuyendo café saludable.",
          badge: "Cupos Limitados",
          ctaText: "Solicitar Cupo",
          ctaUrl: "#block-contact"
        },
        {
          id: "srv-2",
          title: "Asesoría en Salud & Nutrición Funcional",
          description: "Planes personalizados de consumo de Ganoderma Lucidum para prevención, energía y bienestar integral.",
          badge: "Bienestar",
          ctaText: "Consultar Plan",
          ctaUrl: "#block-contact"
        },
        {
          id: "srv-3",
          title: "Programa de Liderazgo Comercial",
          description: "Capacitación avanzada para profesionales que lideran equipos y buscan escalar sus resultados en red.",
          badge: "Liderazgo",
          ctaText: "Postular",
          ctaUrl: "#block-contact"
        },
        {
          id: "srv-4",
          title: "Sesión Diagnóstica Estratégica",
          description: "Evaluación de 20 minutos para identificar si nuestro modelo de distribución es adecuado para tu perfil.",
          badge: "Gratuita",
          ctaText: "Agendar Sesión",
          ctaUrl: "#block-contact"
        }
      ]
    },
    linksBlock: {
      enabled: true,
      title: "Canales & Enlaces Oficiales",
      subtitle: "Accede a mis recursos, comunidad y canales de comunicación directa.",
      items: [
        {
          id: "lnk-1",
          label: "Canal Oficial de WhatsApp",
          url: "https://wa.me/573000000000",
          category: "EXTERNAL",
          featured: true
        },
        {
          id: "lnk-2",
          label: "Portal de Recursos GanoMaster",
          url: "https://ganomaster.pro",
          category: "RESOURCE",
          featured: true
        },
        {
          id: "lnk-3",
          label: "Comunidad Exclusiva de Emprendimiento",
          url: "#",
          category: "COMMUNITY",
          featured: false
        },
        {
          id: "lnk-4",
          label: "Perfil Oficial de Instagram",
          url: "https://instagram.com",
          category: "SOCIAL",
          featured: false
        }
      ]
    },
    eventsBlock: {
      enabled: true,
      title: "Eventos & Calendario",
      subtitle: "Participa en nuestras próximas conferencias y talleres en vivo.",
      items: [
        {
          id: "ev-1",
          title: "Masterclass: Bienestar & Ganoderma en el Siglo XXI",
          date: "Jueves 15 de Agosto · 7:30 PM",
          location: "Zoom en Vivo (Acceso Libre)",
          ctaText: "Reservar Cupo",
          ctaUrl: "#block-contact"
        },
        {
          id: "ev-2",
          title: "Seminario de Expansión & Liderazgo Comercial",
          date: "Sábado 24 de Agosto · 10:00 AM",
          location: "Sede Corporativa & Streaming",
          ctaText: "Inscribirme",
          ctaUrl: "#block-contact"
        }
      ]
    },
    contactBlock: {
      enabled: true,
      title: "Solicita tu Asesoría Personalizada",
      whatsappNumber: "573000000000",
      email: "contacto@tudominio.com",
      ctaText: "Enviar Mensaje por WhatsApp",
      defaultMessage: "Hola, visité tu página de marca personal y me gustaría agendar una asesoría personalizada."
    }
  },
  theme: {
    fontPreset: "modern",
    palettePreset: "cobalt-cyan"
  },
  analytics: {
    measurementId: undefined
  }
};

// ==========================================
// 4. SANITIZADORES Y VALIDADORES DE LÍMITES
// ==========================================

export function validateBusinessConfig(config: unknown): { isValid: boolean; errors: string[]; sanitized: BusinessTemplateConfig } {
  const errors: string[] = [];
  const raw = (config || {}) as Partial<BusinessTemplateConfig>;
  
  const sanitized: BusinessTemplateConfig = {
    ecosystemType: "BUSINESS",
    site: {
      id: String(raw.site?.id || DEFAULT_BUSINESS_CONFIG.site.id).trim(),
      domain: raw.site?.domain ? String(raw.site.domain).trim() : undefined,
      title: String(raw.site?.title || DEFAULT_BUSINESS_CONFIG.site.title).trim(),
      appName: String(raw.site?.appName || DEFAULT_BUSINESS_CONFIG.site.appName).trim(),
      ogTitle: String(raw.site?.ogTitle || DEFAULT_BUSINESS_CONFIG.site.ogTitle).trim(),
      ogDescription: String(raw.site?.ogDescription || DEFAULT_BUSINESS_CONFIG.site.ogDescription).trim(),
      metaDescription: String(raw.site?.metaDescription || DEFAULT_BUSINESS_CONFIG.site.metaDescription).trim(),
    },
    distributor: {
      brandName: String(raw.distributor?.brandName || DEFAULT_BUSINESS_CONFIG.distributor.brandName).trim(),
      firstName: String(raw.distributor?.firstName || DEFAULT_BUSINESS_CONFIG.distributor.firstName).trim(),
      fullName: String(raw.distributor?.fullName || DEFAULT_BUSINESS_CONFIG.distributor.fullName).trim(),
      role: String(raw.distributor?.role || DEFAULT_BUSINESS_CONFIG.distributor.role).trim(),
      whatsappNumber: String(raw.distributor?.whatsappNumber || DEFAULT_BUSINESS_CONFIG.distributor.whatsappNumber).replace(/\D/g, ""),
      phoneNumber: raw.distributor?.phoneNumber ? String(raw.distributor.phoneNumber).trim() : undefined,
      displayPhone: raw.distributor?.displayPhone ? String(raw.distributor.displayPhone).trim() : undefined,
      ctaUrl: String(raw.distributor?.ctaUrl || DEFAULT_BUSINESS_CONFIG.distributor.ctaUrl).trim(),
      defaultMessage: String(raw.distributor?.defaultMessage || DEFAULT_BUSINESS_CONFIG.distributor.defaultMessage).trim(),
    },
    hero: {
      badge: String(raw.hero?.badge || DEFAULT_BUSINESS_CONFIG.hero.badge).trim(),
      headline: String(raw.hero?.headline || DEFAULT_BUSINESS_CONFIG.hero.headline).trim(),
      subheadline: String(raw.hero?.subheadline || DEFAULT_BUSINESS_CONFIG.hero.subheadline).trim(),
      desktopBgUrl: raw.hero?.desktopBgUrl || DEFAULT_BUSINESS_CONFIG.hero.desktopBgUrl,
      mobileBgUrl: raw.hero?.mobileBgUrl || DEFAULT_BUSINESS_CONFIG.hero.mobileBgUrl,
    },
    vsl: {
      provider: raw.vsl?.provider || "youtube",
      embedUrl: String(raw.vsl?.embedUrl || DEFAULT_BUSINESS_CONFIG.vsl.embedUrl).trim(),
      videoTitle: raw.vsl?.videoTitle ? String(raw.vsl.videoTitle).trim() : undefined,
      aspectRatio: raw.vsl?.aspectRatio || "16:9",
      caption: raw.vsl?.caption ? String(raw.vsl.caption).trim() : undefined,
      autoPlay: Boolean(raw.vsl?.autoPlay),
      thumbnailUrl: raw.vsl?.thumbnailUrl ? String(raw.vsl.thumbnailUrl).trim() : undefined,
      durationText: raw.vsl?.durationText ? String(raw.vsl.durationText).trim() : undefined,
    },
    socialProof: raw.socialProof ? {
      enabled: raw.socialProof.enabled !== false,
      avatars: Array.isArray(raw.socialProof.avatars) ? raw.socialProof.avatars : undefined,
      headline: raw.socialProof.headline ? String(raw.socialProof.headline).trim() : undefined,
      subheadline: raw.socialProof.subheadline ? String(raw.socialProof.subheadline).trim() : undefined,
      ratingStars: raw.socialProof.ratingStars ? String(raw.socialProof.ratingStars).trim() : undefined,
    } : undefined,
    comparison: raw.comparison ? {
      enabled: raw.comparison.enabled !== false,
      badge: raw.comparison.badge ? String(raw.comparison.badge).trim() : undefined,
      title: raw.comparison.title ? String(raw.comparison.title).trim() : undefined,
      subtitle: raw.comparison.subtitle ? String(raw.comparison.subtitle).trim() : undefined,
      traditionalTitle: raw.comparison.traditionalTitle ? String(raw.comparison.traditionalTitle).trim() : undefined,
      traditionalItems: Array.isArray(raw.comparison.traditionalItems) ? raw.comparison.traditionalItems.map(i => String(i).trim()) : undefined,
      opportunityTitle: raw.comparison.opportunityTitle ? String(raw.comparison.opportunityTitle).trim() : undefined,
      opportunityItems: Array.isArray(raw.comparison.opportunityItems) ? raw.comparison.opportunityItems.map(i => String(i).trim()) : undefined,
    } : undefined,
    benefits: Array.isArray(raw.benefits) && raw.benefits.length > 0
      ? raw.benefits.slice(0, 4).map((b, idx) => ({
          id: b.id || `b${idx + 1}`,
          title: String(b.title || "").trim(),
          description: String(b.description || "").trim(),
          icon: b.icon ? String(b.icon).trim() : undefined,
        }))
      : DEFAULT_BUSINESS_CONFIG.benefits,
    methodology: raw.methodology ? {
      enabled: raw.methodology.enabled !== false,
      badge: raw.methodology.badge ? String(raw.methodology.badge).trim() : undefined,
      title: raw.methodology.title ? String(raw.methodology.title).trim() : undefined,
      subtitle: raw.methodology.subtitle ? String(raw.methodology.subtitle).trim() : undefined,
      steps: Array.isArray(raw.methodology.steps) ? raw.methodology.steps.slice(0, 3).map((s, idx) => ({
        number: String(s.number || `0${idx + 1}`).trim(),
        title: String(s.title || "").trim(),
        description: String(s.description || "").trim(),
      })) : undefined,
    } : undefined,
    testimonials: raw.testimonials ? {
      enabled: raw.testimonials.enabled !== false,
      badge: raw.testimonials.badge ? String(raw.testimonials.badge).trim() : undefined,
      title: raw.testimonials.title ? String(raw.testimonials.title).trim() : undefined,
      subtitle: raw.testimonials.subtitle ? String(raw.testimonials.subtitle).trim() : undefined,
      items: Array.isArray(raw.testimonials.items) ? raw.testimonials.items.slice(0, 3).map((t, idx) => ({
        id: t.id || `t${idx + 1}`,
        name: String(t.name || "").trim(),
        role: String(t.role || "").trim(),
        quote: String(t.quote || "").trim(),
        avatarUrl: t.avatarUrl ? String(t.avatarUrl).trim() : undefined,
      })) : undefined,
    } : undefined,
    faq: raw.faq ? {
      enabled: raw.faq.enabled !== false,
      badge: raw.faq.badge ? String(raw.faq.badge).trim() : undefined,
      title: raw.faq.title ? String(raw.faq.title).trim() : undefined,
      subtitle: raw.faq.subtitle ? String(raw.faq.subtitle).trim() : undefined,
      items: Array.isArray(raw.faq.items) ? raw.faq.items.slice(0, 6).map((f, idx) => ({
        id: f.id || `f${idx + 1}`,
        question: String(f.question || "").trim(),
        answer: String(f.answer || "").trim(),
      })) : undefined,
    } : undefined,
    cta: {
      primaryText: String(raw.cta?.primaryText || DEFAULT_BUSINESS_CONFIG.cta.primaryText).trim(),
      primaryUrl: String(raw.cta?.primaryUrl || DEFAULT_BUSINESS_CONFIG.cta.primaryUrl).trim(),
      secondaryText: raw.cta?.secondaryText ? String(raw.cta.secondaryText).trim() : undefined,
      secondaryUrl: raw.cta?.secondaryUrl ? String(raw.cta.secondaryUrl).trim() : undefined,
      guaranteeText: raw.cta?.guaranteeText ? String(raw.cta.guaranteeText).trim() : undefined,
      directRegisterText: raw.cta?.directRegisterText ? String(raw.cta.directRegisterText).trim() : undefined,
      directRegisterUrl: raw.cta?.directRegisterUrl ? String(raw.cta.directRegisterUrl).trim() : undefined,
    },
    theme: {
      fontPreset: (raw.theme?.fontPreset && FONT_PRESETS.some(f => f.id === raw.theme?.fontPreset) ? raw.theme.fontPreset : "executive") as FontPreset,
      palettePreset: (raw.theme?.palettePreset && PALETTE_PRESETS.some(p => p.id === raw.theme?.palettePreset) ? raw.theme.palettePreset : "cobalt-cyan") as PalettePreset,
    },
    legal: raw.legal ? {
      disclaimer: raw.legal.disclaimer ? String(raw.legal.disclaimer).trim() : undefined,
      privacyPolicyText: raw.legal.privacyPolicyText ? String(raw.legal.privacyPolicyText).trim() : undefined,
      termsText: raw.legal.termsText ? String(raw.legal.termsText).trim() : undefined,
    } : undefined,
    analytics: {
      measurementId: raw.analytics?.measurementId ? String(raw.analytics.measurementId).trim() : undefined,
    }
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

export function validatePersonalBrandConfig(config: unknown): { isValid: boolean; errors: string[]; sanitized: PersonalBrandTemplateConfig } {
  const errors: string[] = [];
  const raw = (config || {}) as Partial<PersonalBrandTemplateConfig>;

  // Validar y acotar items dentro de los límites estipulados
  const rawServices = raw.blocks?.servicesBlock?.items || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.servicesBlock.items;
  const services: PersonalServiceItem[] = rawServices.slice(0, PERSONAL_BRAND_LIMITS.MAX_SERVICES).map((s, idx) => ({
    id: s.id || `s${idx + 1}`,
    title: String(s.title || "").trim(),
    description: String(s.description || "").trim(),
    badge: s.badge ? String(s.badge).trim() : undefined,
    ctaUrl: s.ctaUrl ? String(s.ctaUrl).trim() : undefined,
    ctaText: s.ctaText ? String(s.ctaText).trim() : undefined,
  }));

  const rawLinks = raw.blocks?.linksBlock?.items || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.linksBlock.items;
  const links: PersonalLinkItem[] = rawLinks.slice(0, PERSONAL_BRAND_LIMITS.MAX_LINKS).map((l, idx) => ({
    id: l.id || `l${idx + 1}`,
    label: String(l.label || "").trim(),
    url: String(l.url || "").trim(),
    category: l.category || "SOCIAL",
    icon: l.icon ? String(l.icon).trim() : undefined,
    featured: Boolean(l.featured),
  }));

  const rawEvents = raw.blocks?.eventsBlock?.items || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.eventsBlock.items;
  const events: PersonalEventItem[] = rawEvents.slice(0, PERSONAL_BRAND_LIMITS.MAX_EVENTS).map((e, idx) => ({
    id: e.id || `e${idx + 1}`,
    date: String(e.date || "").trim(),
    title: String(e.title || "").trim(),
    location: String(e.location || "").trim(),
    ctaUrl: String(e.ctaUrl || "").trim(),
    ctaText: String(e.ctaText || "").trim(),
  }));

  const sanitized: PersonalBrandTemplateConfig = {
    ecosystemType: "PERSONAL_BRAND",
    site: {
      id: String(raw.site?.id || DEFAULT_PERSONAL_BRAND_CONFIG.site.id).trim(),
      domain: raw.site?.domain ? String(raw.site.domain).trim() : undefined,
      title: String(raw.site?.title || DEFAULT_PERSONAL_BRAND_CONFIG.site.title).trim(),
      appName: String(raw.site?.appName || DEFAULT_PERSONAL_BRAND_CONFIG.site.appName).trim(),
      ogTitle: String(raw.site?.ogTitle || DEFAULT_PERSONAL_BRAND_CONFIG.site.ogTitle).trim(),
      ogDescription: String(raw.site?.ogDescription || DEFAULT_PERSONAL_BRAND_CONFIG.site.ogDescription).trim(),
      metaDescription: String(raw.site?.metaDescription || DEFAULT_PERSONAL_BRAND_CONFIG.site.metaDescription).trim(),
    },
    profile: {
      brandName: String(raw.profile?.brandName || DEFAULT_PERSONAL_BRAND_CONFIG.profile.brandName).trim(),
      fullName: String(raw.profile?.fullName || DEFAULT_PERSONAL_BRAND_CONFIG.profile.fullName).trim(),
      headline: String(raw.profile?.headline || DEFAULT_PERSONAL_BRAND_CONFIG.profile.headline).trim(),
      bio: String(raw.profile?.bio || DEFAULT_PERSONAL_BRAND_CONFIG.profile.bio).trim(),
      avatarUrl: String(raw.profile?.avatarUrl || DEFAULT_PERSONAL_BRAND_CONFIG.profile.avatarUrl).trim(),
      coverUrl: raw.profile?.coverUrl ? String(raw.profile.coverUrl).trim() : undefined,
      location: raw.profile?.location ? String(raw.profile.location).trim() : undefined,
      badge: raw.profile?.badge ? String(raw.profile.badge).trim() : undefined,
    },
    blocks: {
      profileBlock: {
        enabled: raw.blocks?.profileBlock?.enabled ?? true,
      },
      bioBlock: {
        enabled: raw.blocks?.bioBlock?.enabled ?? true,
        quote: raw.blocks?.bioBlock?.quote ? String(raw.blocks.bioBlock.quote).trim() : undefined,
        experienceText: raw.blocks?.bioBlock?.experienceText ? String(raw.blocks.bioBlock.experienceText).trim() : undefined,
      },
      servicesBlock: {
        enabled: raw.blocks?.servicesBlock?.enabled ?? true,
        title: String(raw.blocks?.servicesBlock?.title || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.servicesBlock.title).trim(),
        subtitle: raw.blocks?.servicesBlock?.subtitle ? String(raw.blocks.servicesBlock.subtitle).trim() : undefined,
        items: services,
      },
      linksBlock: {
        enabled: raw.blocks?.linksBlock?.enabled ?? true,
        title: String(raw.blocks?.linksBlock?.title || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.linksBlock.title).trim(),
        subtitle: raw.blocks?.linksBlock?.subtitle ? String(raw.blocks.linksBlock.subtitle).trim() : undefined,
        items: links,
      },
      eventsBlock: {
        enabled: raw.blocks?.eventsBlock?.enabled ?? true,
        title: String(raw.blocks?.eventsBlock?.title || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.eventsBlock.title).trim(),
        subtitle: raw.blocks?.eventsBlock?.subtitle ? String(raw.blocks.eventsBlock.subtitle).trim() : undefined,
        items: events,
      },
      contactBlock: {
        enabled: raw.blocks?.contactBlock?.enabled ?? true,
        title: String(raw.blocks?.contactBlock?.title || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.contactBlock.title).trim(),
        whatsappNumber: String(raw.blocks?.contactBlock?.whatsappNumber || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.contactBlock.whatsappNumber).replace(/\D/g, ""),
        email: raw.blocks?.contactBlock?.email ? String(raw.blocks.contactBlock.email).trim() : undefined,
        ctaText: String(raw.blocks?.contactBlock?.ctaText || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.contactBlock.ctaText).trim(),
        defaultMessage: String(raw.blocks?.contactBlock?.defaultMessage || DEFAULT_PERSONAL_BRAND_CONFIG.blocks.contactBlock.defaultMessage).trim(),
      }
    },
    theme: {
      fontPreset: (raw.theme?.fontPreset && FONT_PRESETS.some(f => f.id === raw.theme?.fontPreset) ? raw.theme.fontPreset : "modern") as FontPreset,
      palettePreset: (raw.theme?.palettePreset && PALETTE_PRESETS.some(p => p.id === raw.theme?.palettePreset) ? raw.theme.palettePreset : "cobalt-cyan") as PalettePreset,
    },
    analytics: {
      measurementId: raw.analytics?.measurementId ? String(raw.analytics.measurementId).trim() : undefined,
    }
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}
