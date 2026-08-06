/**
 * app.js - PartnerHub Personal Brand Hub Controller
 * Resuelve bloques modulares, inyecta configuración e inicializa el tema PH-025 dinámicamente.
 */

(function () {
  'use strict';

  // Mapeo de Presets de Paleta (PH-025)
  const PALETTE_MAP = {
    'cobalt-cyan': { base: '#0F172A', accent: '#06B6D4', hover: '#0891B2', bgSecondary: '#1E293B', textOnAccent: '#0F172A' },
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
    root.style.setProperty('--accent-subtle', palette.accent + '1F');
    root.style.setProperty('--border-focus', palette.accent + '80');

    // Aplicar Tipografía
    const font = FONT_MAP[theme.fontPreset] || FONT_MAP['modern'];
    root.style.setProperty('--font-title', font.title);
    root.style.setProperty('--font-body', font.body);
  }

  function renderHub(cfg) {
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

    const blocks = cfg.blocks || {};

    // 2. Profile Block
    const profileSection = document.getElementById('block-profile');
    if (profileSection) {
      if (blocks.profileBlock?.enabled === false) {
        profileSection.classList.add('block-hidden');
      } else {
        profileSection.classList.remove('block-hidden');
        const p = cfg.profile || {};
        
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl && p.avatarUrl) avatarEl.src = p.avatarUrl;

        const coverEl = document.getElementById('profile-cover');
        if (coverEl && p.coverUrl) coverEl.style.backgroundImage = `url('${p.coverUrl}')`;

        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.textContent = p.fullName || p.brandName || 'Nombre del Profesional';

        const headlineEl = document.getElementById('profile-headline');
        if (headlineEl) headlineEl.textContent = p.headline || '';

        const bioEl = document.getElementById('profile-bio');
        if (bioEl) bioEl.textContent = p.bio || '';

        const badgeEl = document.getElementById('profile-badge');
        if (badgeEl) {
          if (p.badge) {
            badgeEl.textContent = p.badge;
            badgeEl.style.display = 'inline-flex';
          } else {
            badgeEl.style.display = 'none';
          }
        }

        const locationEl = document.getElementById('profile-location');
        if (locationEl) {
          if (p.location) {
            locationEl.querySelector('span').textContent = p.location;
            locationEl.style.display = 'inline-flex';
          } else {
            locationEl.style.display = 'none';
          }
        }
      }
    }

    // 3. Bio / Quote Block
    const bioSection = document.getElementById('block-bio');
    if (bioSection) {
      if (blocks.bioBlock?.enabled === false || (!blocks.bioBlock?.quote && !blocks.bioBlock?.experienceText)) {
        bioSection.classList.add('block-hidden');
      } else {
        bioSection.classList.remove('block-hidden');
        const quoteEl = document.getElementById('bio-quote-text');
        if (quoteEl) quoteEl.textContent = `"${blocks.bioBlock.quote || ''}"`;

        const expEl = document.getElementById('bio-exp-text');
        if (expEl) expEl.textContent = blocks.bioBlock.experienceText || '';
      }
    }

    // 4. Services Block (Max 4 items)
    const servicesSection = document.getElementById('block-services');
    if (servicesSection) {
      const items = blocks.servicesBlock?.items || [];
      if (blocks.servicesBlock?.enabled === false || items.length === 0) {
        servicesSection.classList.add('block-hidden');
      } else {
        servicesSection.classList.remove('block-hidden');
        const titleEl = document.getElementById('services-title');
        if (titleEl) titleEl.textContent = blocks.servicesBlock.title || 'Proyectos & Mentorías';

        const subtitleEl = document.getElementById('services-subtitle');
        if (subtitleEl) subtitleEl.textContent = blocks.servicesBlock.subtitle || '';

        const grid = document.getElementById('services-grid');
        if (grid) {
          grid.innerHTML = '';
          items.slice(0, 4).forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
              <div class="service-card-top">
                ${service.badge ? `<span class="service-card-badge">${escapeHtml(service.badge)}</span>` : ''}
                <h3>${escapeHtml(service.title)}</h3>
                <p>${escapeHtml(service.description)}</p>
              </div>
              ${service.ctaUrl ? `
                <a href="${escapeHtml(service.ctaUrl)}" target="_blank" rel="noopener noreferrer" class="service-cta-btn">
                  <span>${escapeHtml(service.ctaText || 'Más Información')}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              ` : ''}
            `;
            grid.appendChild(card);
          });
        }
      }
    }

    // 5. Links Block (Max 8 items)
    const linksSection = document.getElementById('block-links');
    if (linksSection) {
      const items = blocks.linksBlock?.items || [];
      if (blocks.linksBlock?.enabled === false || items.length === 0) {
        linksSection.classList.add('block-hidden');
      } else {
        linksSection.classList.remove('block-hidden');
        const titleEl = document.getElementById('links-title');
        if (titleEl) titleEl.textContent = blocks.linksBlock.title || 'Enlaces Oficiales';

        const subtitleEl = document.getElementById('links-subtitle');
        if (subtitleEl) subtitleEl.textContent = blocks.linksBlock.subtitle || '';

        const stack = document.getElementById('links-stack');
        if (stack) {
          stack.innerHTML = '';
          items.slice(0, 8).forEach(link => {
            const pill = document.createElement('a');
            pill.href = link.url;
            pill.target = '_blank';
            pill.rel = 'noopener noreferrer';
            pill.className = `link-pill ${link.featured ? 'featured' : ''}`;
            pill.innerHTML = `
              <div class="link-pill-left">
                <svg class="link-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>${escapeHtml(link.label)}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            `;
            stack.appendChild(pill);
          });
        }
      }
    }

    // 6. Events Block (Max 6 items)
    const eventsSection = document.getElementById('block-events');
    if (eventsSection) {
      const items = blocks.eventsBlock?.items || [];
      if (blocks.eventsBlock?.enabled === false || items.length === 0) {
        eventsSection.classList.add('block-hidden');
      } else {
        eventsSection.classList.remove('block-hidden');
        const titleEl = document.getElementById('events-title');
        if (titleEl) titleEl.textContent = blocks.eventsBlock.title || 'Próximos Eventos';

        const subtitleEl = document.getElementById('events-subtitle');
        if (subtitleEl) subtitleEl.textContent = blocks.eventsBlock.subtitle || '';

        const stack = document.getElementById('events-stack');
        if (stack) {
          stack.innerHTML = '';
          items.slice(0, 6).forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
              <div class="event-info">
                <span class="event-date">${escapeHtml(event.date)}</span>
                <span class="event-title">${escapeHtml(event.title)}</span>
                <span class="event-location">${escapeHtml(event.location)}</span>
              </div>
              <a href="${escapeHtml(event.ctaUrl)}" target="_blank" rel="noopener noreferrer" class="event-cta">
                ${escapeHtml(event.ctaText || 'Reservar')}
              </a>
            `;
            stack.appendChild(card);
          });
        }
      }
    }

    // 7. Contact Block
    const contactSection = document.getElementById('block-contact');
    if (contactSection) {
      if (blocks.contactBlock?.enabled === false) {
        contactSection.classList.add('block-hidden');
      } else {
        contactSection.classList.remove('block-hidden');
        const titleEl = document.getElementById('contact-title');
        if (titleEl) titleEl.textContent = blocks.contactBlock.title || '¿Listo para conectar?';

        const btn = document.getElementById('btn-contact-main');
        if (btn) {
          const phone = blocks.contactBlock.whatsappNumber ? blocks.contactBlock.whatsappNumber.replace(/\D/g, '') : '';
          const msg = encodeURIComponent(blocks.contactBlock.defaultMessage || 'Hola');
          btn.href = phone ? `https://wa.me/${phone}?text=${msg}` : '#';
          btn.querySelector('span').textContent = blocks.contactBlock.ctaText || 'Conversar por WhatsApp';
        }

        const emailEl = document.getElementById('contact-email');
        if (emailEl) {
          if (blocks.contactBlock.email) {
            emailEl.href = `mailto:${blocks.contactBlock.email}`;
            emailEl.textContent = blocks.contactBlock.email;
            emailEl.style.display = 'inline-block';
          } else {
            emailEl.style.display = 'none';
          }
        }
      }
    }

    // 8. Footer Brand
    const footerBrand = document.getElementById('footer-brand-name');
    if (footerBrand) {
      footerBrand.textContent = cfg.profile?.fullName || cfg.profile?.brandName || 'Hub Oficial';
    }

    // 9. Analytics
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
    renderHub(config);
  });
})();
