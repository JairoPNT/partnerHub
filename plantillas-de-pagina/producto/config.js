/**
 * Configuración del Sitio - Plantilla de Producto
 * Cliente actual / Sitio de prueba: jairo-pinto-test
 */
const CONFIG = {
  // Configuración del sitio y SEO
  site: {
    id: 'jairo-pinto-test',
    title: 'Jairo Pinto — Bienestar y Vitalidad con Gano Excel',
    appName: 'jairo_pinto_wellness',
    ogTitle: 'Jairo Pinto — Bienestar y Vitalidad con Gano Excel',
    ogDescription: 'Transforma tus rituales diarios con el poder adaptógeno del Ganoderma Lucidum. Energía y claridad sin límites.',
    metaDescription: 'Descubre cómo transformar tu día a día con café, cacao y suplementos enriquecidos con Ganoderma lucidum. Bienestar, energía y equilibrio natural.'
  },

  // Datos del Distribuidor / Contacto
  distributor: {
    brandName: 'Jairo Pinto',
    firstName: 'Jairo',
    fullName: 'Jairo Pinto',
    role: 'Distribuidor Autorizado · Gano Excel',
    whatsappNumber: '573188430283',
    phoneNumber: '3188430283',
    displayPhone: '3188430283',
    defaultMessage: 'Hola Jairo, vengo de tu página web. Me gustaría tener más información sobre el Ganoderma de Gano Excel.'
  },

  // Imágenes del Hero (Específicas del cliente)
  hero: {
    desktop: 'https://media.partnerhub.club/clientes/jairo-pinto-test/producto/v1/hero-desktop.webp',
    mobile: 'https://media.partnerhub.club/clientes/jairo-pinto-test/producto/v1/hero-mobile.webp'
  },

  // Base URL para Recursos Comunes (Imágenes de productos y Videos)
  mediaBaseUrl: 'https://media.partnerhub.club/comunes/producto/v1/'
};

// Hacer disponible globalmente en el navegador
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
