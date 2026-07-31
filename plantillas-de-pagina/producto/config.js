/**
 * Configuración del Sitio - Plantilla de Producto
 * Fuente maestra: ganomaster
 */
const CONFIG = {
  // Configuración del sitio y SEO
  site: {
    id: 'ganomaster',
    title: 'GanoMaster — Bienestar y Vitalidad con Gano Excel',
    appName: 'ganomaster',
    ogTitle: 'GanoMaster — Bienestar y Vitalidad con Gano Excel',
    ogDescription: 'Transforma tus rituales diarios con el poder adaptógeno del Ganoderma Lucidum. Energía y claridad sin límites.',
    metaDescription: 'Descubre cómo transformar tu día a día con café, cacao y suplementos enriquecidos con Ganoderma lucidum. Bienestar, energía y equilibrio natural.'
  },

  // Datos del Distribuidor / Contacto
  distributor: {
    brandName: 'GanoMaster',
    firstName: 'GanoMaster',
    fullName: 'GanoMaster',
    role: 'Distribuidor Autorizado · Gano Excel',
    whatsappNumber: '',
    phoneNumber: '',
    displayPhone: '',
    purchaseUrl: '',
    defaultMessage: 'Hola, vengo de tu pagina web. Me gustaria tener mas informacion sobre el Ganoderma de Gano Excel.'
  },

  // Imágenes del Hero (Específicas del cliente)
  hero: {
    desktop: '',
    mobile: ''
  },

  // Base URL para Recursos Comunes (Imágenes de productos y Videos)
  mediaBaseUrl: 'https://media.partnerhub.club/comunes/producto/v1/'
};

// Hacer disponible globalmente en el navegador
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
