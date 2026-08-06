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

export const MASTER_SITE_DOMAINS: Record<EcosystemType, string> = {
  PRODUCT: "ganomaster.pro",
  BUSINESS: "business.ganomaster.pro",
  PERSONAL_BRAND: "brand.ganomaster.pro"
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
  };
  benefits: BusinessBenefitItem[];
  cta: {
    primaryText: string;
    primaryUrl: string;
    secondaryText?: string;
    secondaryUrl?: string;
    guaranteeText?: string;
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
    headline: "Construye un Negocio Sólido Apalancado en Bienestar y Consumo Masivo",
    subheadline: "Mira el video completo de 10 minutos para conocer el sistema de distribución, márgenes y plan de expansión.",
    desktopBgUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    mobileBgUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
  },
  vsl: {
    provider: "youtube",
    embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    videoTitle: "Presentación Oficial del Modelo de Negocio",
    aspectRatio: "16:9",
    caption: "Duración aproximada: 10 minutos · Activa el sonido para mejor experiencia"
  },
  benefits: [
    {
      id: "b1",
      title: "Modelo de Consumo Masivo",
      description: "Productos de alta rotación diaria y retención natural sin ventas agresivas."
    },
    {
      id: "b2",
      title: "Infraestructura & Logística Resuelta",
      description: "Compañía multinacional respalda el inventario, envíos y cobros automatizados."
    },
    {
      id: "b3",
      title: "Mentoría y Sistema de Duplicación",
      description: "Capacitación paso a paso desde el primer día con herramientas digitales validadas."
    }
  ],
  cta: {
    primaryText: "Agendar Sesión de Evaluación",
    primaryUrl: "https://wa.me/573000000000",
    secondaryText: "Conocer Más Detalles",
    secondaryUrl: "#beneficios",
    guaranteeText: "Cupos limitados por zona para acompañamiento personalizado."
  },
  theme: {
    fontPreset: "executive",
    palettePreset: "cobalt-cyan"
  }
};

export const DEFAULT_PERSONAL_BRAND_CONFIG: PersonalBrandTemplateConfig = {
  ecosystemType: "PERSONAL_BRAND",
  site: {
    id: "ganomaster-personal-brand",
    title: "Líder de Bienestar & Mentor Comercial",
    appName: "ganomaster-personal-brand",
    ogTitle: "Líder de Bienestar & Mentor Comercial — Hub Oficial",
    ogDescription: "Bienvenido a mi espacio oficial: proyectos, mentorías, recursos y acceso directo a mi comunidad.",
    metaDescription: "Espacio profesional de mentoría, proyectos de bienestar y conexión directa con empresarios."
  },
  profile: {
    brandName: "Marca Personal",
    fullName: "Nombre del Profesional",
    headline: "Emprendedor, Mentor de Bienestar & Estratega de Negocios",
    bio: "Ayudo a personas y equipos a desbloquear su potencial combinando salud integral, hábitos conscientes y desarrollo de negocios escalables.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    location: "Colombia & Internacional",
    badge: "Mentor Verificado"
  },
  blocks: {
    profileBlock: {
      enabled: true
    },
    bioBlock: {
      enabled: true,
      quote: "El verdadero liderazgo no consiste en crear seguidores, sino en inspirar a nuevos líderes a transformar su entorno.",
      experienceText: "+8 años liderando organizaciones comerciales y proyectos de salud adaptógena."
    },
    servicesBlock: {
      enabled: true,
      title: "Proyectos & Mentorías",
      subtitle: "Áreas en las que colaboro activamente",
      items: [
        {
          id: "s1",
          title: "Mentoría 1-a-1 en Liderazgo",
          description: "Acompañamiento personalizado para estructurar metas comerciales y liderazgo de equipos.",
          badge: "Cupos Limitados",
          ctaText: "Consultar Disponibilidad",
          ctaUrl: "https://wa.me/573000000000"
        },
        {
          id: "s2",
          title: "Expansión de Red Comercial",
          description: "Únete a mi equipo de distribución internacional en la industria del bienestar.",
          badge: "Oportunidad",
          ctaText: "Postularme",
          ctaUrl: "https://wa.me/573000000000"
        }
      ]
    },
    linksBlock: {
      enabled: true,
      title: "Enlaces & Canales Oficiales",
      subtitle: "Conéctate conmigo en mis diferentes plataformas",
      items: [
        {
          id: "l1",
          label: "Canal de WhatsApp Oficial",
          url: "https://wa.me/573000000000",
          category: "COMMUNITY",
          featured: true
        },
        {
          id: "l2",
          label: "Instagram Profesional",
          url: "https://instagram.com",
          category: "SOCIAL"
        },
        {
          id: "l3",
          label: "Página de Productos & Bienestar",
          url: "https://ganomaster.pro",
          category: "RESOURCE"
        }
      ]
    },
    eventsBlock: {
      enabled: true,
      title: "Próximos Eventos & Webinars",
      subtitle: "Sesiones en vivo y encuentros presenciales",
      items: [
        {
          id: "e1",
          date: "Jueves 8:00 PM (GMT-5)",
          title: "Masterclass: Hábitos y Negocio en la Nueva Economía",
          location: "Sesión Virtual en Vivo",
          ctaText: "Reservar Cupo",
          ctaUrl: "https://wa.me/573000000000"
        }
      ]
    },
    contactBlock: {
      enabled: true,
      title: "¿Listo para comenzar?",
      whatsappNumber: "573000000000",
      email: "contacto@dominio.com",
      ctaText: "Conversar Directamente por WhatsApp",
      defaultMessage: "Hola, visité tu Hub de Marca Personal y me interesa conectar contigo."
    }
  },
  theme: {
    fontPreset: "modern",
    palettePreset: "cobalt-cyan"
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
    },
    benefits: Array.isArray(raw.benefits) && raw.benefits.length > 0
      ? raw.benefits.slice(0, 4).map((b, idx) => ({
          id: b.id || `b${idx + 1}`,
          title: String(b.title || "").trim(),
          description: String(b.description || "").trim(),
          icon: b.icon ? String(b.icon).trim() : undefined,
        }))
      : DEFAULT_BUSINESS_CONFIG.benefits,
    cta: {
      primaryText: String(raw.cta?.primaryText || DEFAULT_BUSINESS_CONFIG.cta.primaryText).trim(),
      primaryUrl: String(raw.cta?.primaryUrl || DEFAULT_BUSINESS_CONFIG.cta.primaryUrl).trim(),
      secondaryText: raw.cta?.secondaryText ? String(raw.cta.secondaryText).trim() : undefined,
      secondaryUrl: raw.cta?.secondaryUrl ? String(raw.cta.secondaryUrl).trim() : undefined,
      guaranteeText: raw.cta?.guaranteeText ? String(raw.cta.guaranteeText).trim() : undefined,
    },
    theme: {
      fontPreset: (raw.theme?.fontPreset && FONT_PRESETS.some(f => f.id === raw.theme?.fontPreset) ? raw.theme.fontPreset : "executive") as FontPreset,
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
