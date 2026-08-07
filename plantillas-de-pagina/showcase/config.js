/**
 * config.js - Showcase Central Hub
 * Configuración estática para ganomaster.pro
 */
window.CONFIG = {
  site: {
    id: "ganomaster-showcase",
    domain: "ganomaster.pro",
    title: "GanoMaster Pro · Suite de Ecosistemas Digitales",
    appName: "GanoMaster Showcase",
    ogTitle: "GanoMaster Pro · Ecosistemas Digitales para Distribuidores",
    ogDescription: "Explora las herramientas y páginas de prospección, producto y marca personal de la red Gano Excel.",
    metaDescription: "Vitrina oficial y suite de ecosistemas digitales GanoMaster Pro: Producto, Negocio VSL y Marca Personal."
  },
  theme: {
    fontPreset: "font-modern",
    palettePreset: "palette-ocean"
  },
  ecosystems: [
    {
      id: "product",
      name: "Página de Producto",
      tagline: "Conversión Directa · Salud & Bienestar",
      description: "Landing comercial de alto impacto diseñada para la venta y educación sobre Ganoderma Lucidum y extractos adaptógenos de Gano Excel.",
      badge: "Ecosistema Activo",
      subdomain: "product.ganomaster.pro",
      url: "https://product.ganomaster.pro",
      icon: "shopping-bag",
      features: [
        "Presentación visual de productos adaptógenos y café saludable",
        "Formularios de compra y contacto directo vía WhatsApp",
        "Pruebas de calidad y respaldos científicos certificados",
        "Optimización SEO y velocidad de carga ultrarrápida"
      ],
      previewGradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 116, 144, 0.05))",
      accentColor: "#06b6d4"
    },
    {
      id: "business",
      name: "Negocio & Prospección (VSL)",
      tagline: "Video Sales Letter · Oportunidad Comercial",
      description: "Embudo audiovisual estructurado para presentar el modelo de negocio, filtrar prospectos calificados y conectar con líderes de equipo.",
      badge: "Ecosistema Activo",
      subdomain: "business.ganomaster.pro",
      url: "https://business.ganomaster.pro",
      icon: "video",
      features: [
        "Reproductor de video VSL de alta conversión",
        "Sección de pilares de negocio y plan de compensación",
        "Llamada a la acción con mensaje validado a WhatsApp",
        "Filtro de prospectos por perfil y experiencia"
      ],
      previewGradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(67, 56, 202, 0.05))",
      accentColor: "#6366f1"
    },
    {
      id: "personal-brand",
      name: "Hub de Marca Personal",
      tagline: "Bio & Enlaces · Autoridad y Liderazgo",
      description: "Perfil profesional modular tipo Linktree enriquecido para centralizar tus redes sociales, servicios, biografía y agenda de eventos.",
      badge: "Ecosistema Activo",
      subdomain: "brand.ganomaster.pro",
      url: "https://brand.ganomaster.pro",
      icon: "user-check",
      features: [
        "Bloques modulares de servicios, biografía y eventos",
        "Centralización de canales oficiales y redes sociales",
        "Botón de agendamiento y contacto directo",
        "Personalización estética con 9 tipografías y 10 paletas"
      ],
      previewGradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))",
      accentColor: "#10b981"
    }
  ],
  futureExpansions: [
    {
      name: "Eventos & Convenciones",
      subdomain: "eventos.ganomaster.pro",
      description: "Página de registro para seminarios presenciales y virtuales.",
      status: "Próximamente"
    },
    {
      name: "Catálogo Interactivo",
      subdomain: "catalogo.ganomaster.pro",
      description: "Visor dinámico de referencias, fichas técnicas y precios.",
      status: "Próximamente"
    }
  ]
};
