/**
 * app.js - PartnerHub Business / VSL Template Controller
 * Resuelve placeholders, inyecta configuración e inicializa el tema PH-025 dinámicamente.
 */

(function () {
  'use strict';

  // Mapeo de Presets de Paleta (PH-025)
  const PALETTE_MAP = {
    'cobalt-cyan': { base: '#0F172A', accent: '#06B6D4', hover: '#0891B2', bgSecondary: '#111827', textOnAccent: '#0F172A' },
    'emerald-slate': { base: '#022C22', accent: '#10B981', hover: '#059669', bgSecondary: '#064E3B', textOnAccent: '#022C22' },
    'coffee-gold': { base: '#271C19', accent: '#D97706', hover: '#B45309', bgSecondary: '#3C2A21', textOnAccent: '#FFFFFF' },
    'rose-graphite': { base: '#18181B', accent: '#F43F5E', hover: '#E11D48', bgSecondary: '#27272A', textOnAccent: '#FFFFFF' },
    'indigo-lime': { base: '#1E1B4B', accent: '#84CC16', hover: '#65A30D', bgSecondary: '#2E1065', textOnAccent: '#1E1B4B' },
    'teal-navy': { base: '#0A192F', accent: '#14B8A6', hover: '#0D9488', bgSecondary: '#112240', textOnAccent: '#0A192F' },
    'wine-blush': { base: '#2A0813', accent: '#FB7185', hover: '#F43F5E', bgSecondary: '#4C0519', textOnAccent: '#2A0813' },
    'forest-mint': { base: '#052E16', accent: '#34D399', hover: '#10B981', bgSecondary: '#064E3B', textOnAccent: '#052E16' },
    'charcoal-amber': { base: '#171717', accent: '#F59E0B', hover: '#D97706', bgSecondary: '#262626', textOnAccent: '#171717' },
    'sky-stone': { base: '#0C4A6E', accent: '#38BDF8', hover: '#0284C7', bgSecondary: '#075985', textOnAccent: '#0C4A6E' }
  };

  // Mapeo de Presets de Fuentes (PH-025)
  const FONT_MAP = {
    'executive': { title: "'Montserrat', sans-serif", body: "'Space Grotesk', sans-serif" },
    'modern': { title: "'Outfit', sans-serif", body: "'Inter', sans-serif" },
    'editorial': { title: "'Playfair Display', serif", body: "'Lora', serif" },
    'friendly': { title: "'Poppins', sans-serif", body: "'DM Sans', sans-serif" },
    'premium': { title: "'Manrope', sans-serif", body: "'Lora', serif" },
    'minimal': { title: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    'serif-chic': { title: "'Cormorant Garamond', serif", body: "'Montserrat', sans-serif" },
    'romantic-serif': { title: "'Cormorant Garamond', serif", body: "'Lora', serif" },
    'luxury-serif': { title: "'Bodoni Moda', serif", body: "'Montserrat', sans-serif" }
  };

  function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;

    // Aplicar Paleta
    const palette = PALETTE_MAP[theme.palettePreset] || PALETTE_MAP['cobalt-cyan'];
    root.style.setProperty('--accent-base', palette.base);
    root.style.setProperty('--accent-color', palette.accent);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--accent-glow', palette.accent + '40');
    root.style.setProperty('--accent-subtle', palette.accent + '1A');
    root.style.setProperty('--border-focus', palette.accent + '80');

    // Aplicar Tipografía
    const font = FONT_MAP[theme.fontPreset] || FONT_MAP['executive'];
    root.style.setProperty('--font-title', font.title);
    root.style.setProperty('--font-body', font.body);
  }

  function renderDynamicContent(cfg) {
    if (!cfg) return;

    // 1. Meta / SEO
    if (cfg.site) {
      if (cfg.site.title) document.title = cfg.site.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && cfg.site.metaDescription) metaDesc.setAttribute('content', cfg.site.metaDescription);
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && cfg.site.ogTitle) ogTitle.setAttribute('content', cfg.site.ogTitle);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && cfg.site.ogDescription) ogDesc.setAttribute('content', cfg.site.ogDescription);
    }

    // 2. Brand & Header
    const brandNameEls = document.querySelectorAll('[data-bind="distributor.brandName"]');
    brandNameEls.forEach(el => el.textContent = cfg.distributor?.brandName || 'Líder de Negocio');

    const brandRoleEls = document.querySelectorAll('[data-bind="distributor.role"]');
    brandRoleEls.forEach(el => el.textContent = cfg.distributor?.role || 'Líder Comercial');

    const brandFullNameEls = document.querySelectorAll('[data-bind="distributor.fullName"]');
    brandFullNameEls.forEach(el => el.textContent = cfg.distributor?.fullName || 'Empresario Asociado');

    // 3. Hero
    const heroBadgeEl = document.querySelector('[data-bind="hero.badge"]');
    if (heroBadgeEl && cfg.hero?.badge) heroBadgeEl.textContent = cfg.hero.badge;

    const heroHeadlineEl = document.querySelector('[data-bind="hero.headline"]');
    if (heroHeadlineEl && cfg.hero?.headline) heroHeadlineEl.textContent = cfg.hero.headline;

    const heroSubheadlineEl = document.querySelector('[data-bind="hero.subheadline"]');
    if (heroSubheadlineEl && cfg.hero?.subheadline) heroSubheadlineEl.textContent = cfg.hero.subheadline;

    // 4. VSL Player
    const vslIframe = document.getElementById('vsl-iframe');
    if (vslIframe && cfg.vsl?.embedUrl) {
      vslIframe.src = cfg.vsl.embedUrl;
      vslIframe.title = cfg.vsl.videoTitle || 'Presentación de Negocio';
    }

    const vslAspectContainer = document.getElementById('vsl-aspect-container');
    if (vslAspectContainer && cfg.vsl?.aspectRatio === '4:3') {
      vslAspectContainer.classList.add('ratio-4-3');
    }

    const vslCaptionEl = document.querySelector('[data-bind="vsl.caption"]');
    if (vslCaptionEl && cfg.vsl?.caption) vslCaptionEl.textContent = cfg.vsl.caption;

    // 5. CTAs
    const ctaUrl = cfg.cta?.primaryUrl || cfg.distributor?.ctaUrl || (cfg.distributor?.whatsappNumber ? `https://wa.me/${cfg.distributor.whatsappNumber}` : '#');
    const ctaPrimaryLinks = document.querySelectorAll('.bind-cta-primary');
    ctaPrimaryLinks.forEach(link => {
      link.setAttribute('href', ctaUrl);
      if (link.dataset.bindText && cfg.cta?.primaryText) {
        link.textContent = cfg.cta.primaryText;
      }
    });

    const ctaSecondaryLink = document.querySelector('.bind-cta-secondary');
    if (ctaSecondaryLink && cfg.cta?.secondaryUrl) {
      ctaSecondaryLink.setAttribute('href', cfg.cta.secondaryUrl);
      if (cfg.cta.secondaryText) ctaSecondaryLink.textContent = cfg.cta.secondaryText;
    }

    const guaranteeTextEl = document.querySelector('[data-bind="cta.guaranteeText"]');
    if (guaranteeTextEl && cfg.cta?.guaranteeText) guaranteeTextEl.textContent = cfg.cta.guaranteeText;

    // 6. Benefits List
    const benefitsGrid = document.getElementById('benefits-grid');
    if (benefitsGrid && Array.isArray(cfg.benefits) && cfg.benefits.length > 0) {
      benefitsGrid.innerHTML = '';
      cfg.benefits.forEach((benefit) => {
        const card = document.createElement('div');
        card.className = 'benefit-card';
        card.innerHTML = `
          <div class="benefit-icon-wrapper">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h3>${escapeHtml(benefit.title)}</h3>
          <p>${escapeHtml(benefit.description)}</p>
        `;
        benefitsGrid.appendChild(card);
      });
    }

    // 7. Analytics
    if (cfg.analytics?.measurementId && typeof window.gtag === 'function') {
      window.gtag('config', cfg.analytics.measurementId);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', function () {
    const config = window.CONFIG || {};
    applyTheme(config.theme);
    renderDynamicContent(config);
  });
})();
