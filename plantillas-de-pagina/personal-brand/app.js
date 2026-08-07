/**
 * app.js - Personal Brand Template Controller
 * Ecosistema: PERSONAL_BRAND (PH-025 & PH-033)
 * Inyecta dinámicamente configuración, aplica temas y maneja interacciones de asesoría.
 */

(function () {
  'use strict';

  // 1. Mapeo de Presets de Paleta (PH-025)
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

  // 2. Mapeo de Presets de Fuentes (PH-025)
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

    const palette = PALETTE_MAP[theme.palettePreset] || PALETTE_MAP['cobalt-cyan'];
    root.style.setProperty('--accent-base', palette.base);
    root.style.setProperty('--accent-color', palette.accent);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--accent-glow', palette.accent + '4D'); // 30% alpha
    root.style.setProperty('--accent-subtle', palette.accent + '1F'); // 12% alpha
    root.style.setProperty('--border-focus', palette.accent + '80'); // 50% alpha

    const font = FONT_MAP[theme.fontPreset] || FONT_MAP['modern'];
    root.style.setProperty('--font-title', font.title);
    root.style.setProperty('--font-body', font.body);
  }

  function getCategorySvgIcon(category, url) {
    const u = (url || '').toLowerCase();
    const cat = (category || '').toUpperCase();

    if (u.includes('wa.me') || u.includes('whatsapp')) {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    }
    if (u.includes('instagram.com')) {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`;
    }
    if (u.includes('linkedin.com')) {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`;
    }
    if (u.includes('tiktok.com')) {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`;
    }
    if (cat === 'RESOURCE' || u.includes('ganomaster.pro')) {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    }
    if (cat === 'COMMUNITY') {
      return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    }
    return `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

    // 2. Profile & Header
    const profile = cfg.profile || {};
    const fullNameEls = document.querySelectorAll('[data-bind="profile.fullName"]');
    fullNameEls.forEach(el => el.textContent = profile.fullName || 'Nombre del Profesional');

    const brandNameEls = document.querySelectorAll('[data-bind="profile.brandName"]');
    brandNameEls.forEach(el => el.textContent = profile.brandName || 'Marca Personal');

    const headlineEls = document.querySelectorAll('[data-bind="profile.headline"]');
    headlineEls.forEach(el => el.textContent = profile.headline || 'Liderazgo & Consultoría');

    const bioEl = document.querySelector('[data-bind="profile.bio"]');
    if (bioEl && profile.bio) bioEl.textContent = profile.bio;

    const badgeEls = document.querySelectorAll('[data-bind="profile.badge"]');
    badgeEls.forEach(el => {
      if (profile.badge) {
        el.textContent = profile.badge;
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });

    const locationEl = document.querySelector('[data-bind="profile.location"]');
    const locationPill = document.getElementById('profile-location-pill');
    if (locationEl) {
      if (profile.location) {
        locationEl.textContent = profile.location;
        if (locationPill) locationPill.style.display = '';
      } else if (locationPill) {
        locationPill.style.display = 'none';
      }
    }

    if (profile.avatarUrl) {
      const avatarImgs = document.querySelectorAll('[data-bind-src="profile.avatarUrl"]');
      avatarImgs.forEach(img => img.setAttribute('src', profile.avatarUrl));
    }

    if (profile.coverUrl) {
      const coverImg = document.getElementById('profile-cover');
      if (coverImg) coverImg.setAttribute('src', profile.coverUrl);
    }

    const blocks = cfg.blocks || {};

    // 3. Bio Block
    const bioBlockEl = document.getElementById('block-bio');
    const navLinkBio = document.getElementById('nav-link-bio');
    if (blocks.bioBlock?.enabled === false) {
      if (bioBlockEl) bioBlockEl.style.display = 'none';
      if (navLinkBio) navLinkBio.style.display = 'none';
    } else {
      const quoteEl = document.getElementById('bio-quote-text');
      if (quoteEl && blocks.bioBlock?.quote) {
        quoteEl.textContent = `"${blocks.bioBlock.quote}"`;
      }
      const expTextEl = document.getElementById('bio-experience-text');
      if (expTextEl && blocks.bioBlock?.experienceText) {
        expTextEl.textContent = blocks.bioBlock.experienceText;
      }
    }

    // 4. Services Block (Máximo 4 items)
    const servicesBlockEl = document.getElementById('block-services');
    const navLinkServices = document.getElementById('nav-link-services');
    if (blocks.servicesBlock?.enabled === false) {
      if (servicesBlockEl) servicesBlockEl.style.display = 'none';
      if (navLinkServices) navLinkServices.style.display = 'none';
    } else {
      const srvTitleEl = document.querySelector('[data-bind="blocks.servicesBlock.title"]');
      if (srvTitleEl && blocks.servicesBlock?.title) srvTitleEl.textContent = blocks.servicesBlock.title;

      const srvSubtitleEl = document.querySelector('[data-bind="blocks.servicesBlock.subtitle"]');
      if (srvSubtitleEl && blocks.servicesBlock?.subtitle) srvSubtitleEl.textContent = blocks.servicesBlock.subtitle;

      const servicesContainer = document.getElementById('services-container');
      if (servicesContainer && Array.isArray(blocks.servicesBlock?.items)) {
        servicesContainer.innerHTML = '';
        const items = blocks.servicesBlock.items.slice(0, 4);
        items.forEach(srv => {
          const card = document.createElement('div');
          card.className = 'service-card';
          
          const badgeHtml = srv.badge ? `<span class="service-badge">${escapeHtml(srv.badge)}</span>` : '';
          const ctaUrl = srv.ctaUrl || (blocks.contactBlock?.whatsappNumber ? `https://wa.me/${blocks.contactBlock.whatsappNumber}?text=${encodeURIComponent('Hola, me interesa información sobre: ' + srv.title)}` : '#block-contact');
          const ctaText = srv.ctaText || 'Solicitar Asesoría';

          card.innerHTML = `
            <div class="service-header">
              ${badgeHtml}
              <h3 class="service-title">${escapeHtml(srv.title)}</h3>
            </div>
            <p class="service-description">${escapeHtml(srv.description)}</p>
            <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" class="service-btn">
              <span>${escapeHtml(ctaText)}</span>
              <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          `;
          servicesContainer.appendChild(card);
        });
      }
    }

    // 5. Links Block (Máximo 8 items)
    const linksBlockEl = document.getElementById('block-links');
    const navLinkLinks = document.getElementById('nav-link-links');
    if (blocks.linksBlock?.enabled === false) {
      if (linksBlockEl) linksBlockEl.style.display = 'none';
      if (navLinkLinks) navLinkLinks.style.display = 'none';
    } else {
      const linksTitleEl = document.querySelector('[data-bind="blocks.linksBlock.title"]');
      if (linksTitleEl && blocks.linksBlock?.title) linksTitleEl.textContent = blocks.linksBlock.title;

      const linksSubtitleEl = document.querySelector('[data-bind="blocks.linksBlock.subtitle"]');
      if (linksSubtitleEl && blocks.linksBlock?.subtitle) linksSubtitleEl.textContent = blocks.linksBlock.subtitle;

      const linksContainer = document.getElementById('links-container');
      if (linksContainer && Array.isArray(blocks.linksBlock?.items)) {
        linksContainer.innerHTML = '';
        const items = blocks.linksBlock.items.slice(0, 8);
        items.forEach(link => {
          const row = document.createElement('a');
          row.className = 'link-item-row' + (link.featured ? ' featured' : '');
          row.href = link.url || '#';
          row.target = '_blank';
          row.rel = 'noopener noreferrer';

          const iconSvg = getCategorySvgIcon(link.category, link.url);
          const categoryTag = link.category ? `<span class="link-category-tag">${escapeHtml(link.category)}</span>` : '';

          row.innerHTML = `
            <div class="link-left-content">
              <div class="link-icon-box">
                ${iconSvg}
              </div>
              <div class="link-title-group">
                <span class="link-label">${escapeHtml(link.label)}</span>
                ${categoryTag}
              </div>
            </div>
            <div class="link-arrow-box">
              <svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          `;
          linksContainer.appendChild(row);
        });
      }
    }

    // 6. Events Block (Máximo 6 items)
    const eventsBlockEl = document.getElementById('block-events');
    const navLinkEvents = document.getElementById('nav-link-events');
    if (blocks.eventsBlock?.enabled === false) {
      if (eventsBlockEl) eventsBlockEl.style.display = 'none';
      if (navLinkEvents) navLinkEvents.style.display = 'none';
    } else {
      const eventsTitleEl = document.querySelector('[data-bind="blocks.eventsBlock.title"]');
      if (eventsTitleEl && blocks.eventsBlock?.title) eventsTitleEl.textContent = blocks.eventsBlock.title;

      const eventsSubtitleEl = document.querySelector('[data-bind="blocks.eventsBlock.subtitle"]');
      if (eventsSubtitleEl && blocks.eventsBlock?.subtitle) eventsSubtitleEl.textContent = blocks.eventsBlock.subtitle;

      const eventsContainer = document.getElementById('events-container');
      if (eventsContainer && Array.isArray(blocks.eventsBlock?.items)) {
        eventsContainer.innerHTML = '';
        const items = blocks.eventsBlock.items.slice(0, 6);
        items.forEach(ev => {
          const card = document.createElement('div');
          card.className = 'event-card';

          const ctaUrl = ev.ctaUrl || (blocks.contactBlock?.whatsappNumber ? `https://wa.me/${blocks.contactBlock.whatsappNumber}?text=${encodeURIComponent('Hola, deseo reservar un cupo para el evento: ' + ev.title)}` : '#block-contact');
          const ctaText = ev.ctaText || 'Reservar Cupo';

          card.innerHTML = `
            <div>
              <div class="event-date-row">
                <svg class="icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <span>${escapeHtml(ev.date)}</span>
              </div>
              <h3 class="event-title">${escapeHtml(ev.title)}</h3>
              <p class="event-location">
                <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${escapeHtml(ev.location)}</span>
              </p>
            </div>
            <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" class="event-btn">
              <span>${escapeHtml(ctaText)}</span>
              <svg class="icon-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          `;
          eventsContainer.appendChild(card);
        });
      }
    }

    // 7. Contact Block & Interactive WhatsApp session builder
    const contact = blocks.contactBlock || {};
    const contactBlockEl = document.getElementById('block-contact');
    const navLinkContact = document.getElementById('nav-link-contact');
    if (contact.enabled === false) {
      if (contactBlockEl) contactBlockEl.style.display = 'none';
      if (navLinkContact) navLinkContact.style.display = 'none';
    } else {
      const contactTitleEl = document.querySelector('[data-bind="blocks.contactBlock.title"]');
      if (contactTitleEl && contact.title) contactTitleEl.textContent = contact.title;

      const ctaTextEl = document.querySelector('[data-bind="blocks.contactBlock.ctaText"]');
      if (ctaTextEl && contact.ctaText) ctaTextEl.textContent = contact.ctaText;

      const emailTextEl = document.getElementById('contact-email-text');
      const emailLinkEl = document.getElementById('contact-email-link');
      if (contact.email) {
        if (emailTextEl) emailTextEl.textContent = contact.email;
        if (emailLinkEl) emailLinkEl.href = `mailto:${contact.email}`;
      } else if (emailLinkEl) {
        emailLinkEl.style.display = 'none';
      }

      // Configurar generador de enlace de WhatsApp dinámico
      const waNumber = (contact.whatsappNumber || '').replace(/\D/g, '');
      const defaultMsg = contact.defaultMessage || 'Hola, visité tu Hub de Marca Personal y me gustaría solicitar una cita de asesoría personalizada.';
      
      const buildWaUrl = (customTopic) => {
        let msg = defaultMsg;
        if (customTopic) {
          msg = `Hola, visité tu Hub de Marca Personal y me gustaría agendar una sesión sobre: *${customTopic}*.`;
        }
        return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
      };

      const mainWaBtn = document.getElementById('btn-main-whatsapp');
      if (mainWaBtn) {
        mainWaBtn.href = buildWaUrl();
      }

      // Enlazar botones generales de contacto
      const generalWaLinks = document.querySelectorAll('.bind-wa-contact');
      generalWaLinks.forEach(link => {
        if (link.id !== 'btn-main-whatsapp') {
          link.href = buildWaUrl();
        }
      });

      // Píldoras interactivas de selección de tema
      const sessionPills = document.querySelectorAll('.session-type-pill');
      sessionPills.forEach(pill => {
        pill.addEventListener('click', function () {
          sessionPills.forEach(p => p.classList.remove('active'));
          this.classList.add('active');
          const topic = this.getAttribute('data-session-topic');
          if (mainWaBtn) {
            mainWaBtn.href = buildWaUrl(topic);
          }
        });
      });
    }

    // 8. Footer Año
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear().toString();
    }

    // 9. Analytics
    if (cfg.analytics?.measurementId && typeof window.gtag === 'function') {
      window.gtag('config', cfg.analytics.measurementId);
    }
  }

  // Inicialización en carga del DOM
  document.addEventListener('DOMContentLoaded', function () {
    const config = window.CONFIG || {};
    applyTheme(config.theme);
    renderDynamicContent(config);
  });
})();
