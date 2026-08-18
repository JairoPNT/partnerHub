/**
 * app.js - PartnerHub Business / VSL Template Controller
 * Resuelve placeholders, inyecta configuración, maneja interacciones 3D del VSL,
 * acordeones FAQ y modales legales según PH-025 y PH-033.
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

  function getBenefitIconSvg(index, title) {
    const t = (title || '').toLowerCase();
    if (t.includes('socio') || t.includes('compañía') || t.includes('multinacional') || index === 0) {
      return `<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    }
    if (t.includes('consumo') || t.includes('producto') || t.includes('hábito') || t.includes('café') || index === 1) {
      return `<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    }
    if (t.includes('logística') || t.includes('operación') || t.includes('infraestructura') || index === 2) {
      return `<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
    }
    return `<svg class="icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
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

    // 2. Brand & Header Bindings
    document.querySelectorAll('[data-bind="distributor.brandName"]').forEach(el => {
      el.textContent = cfg.distributor?.brandName || 'Nexus Team';
    });
    document.querySelectorAll('[data-bind="distributor.role"]').forEach(el => {
      el.textContent = cfg.distributor?.role || 'Distribuidor Autorizado Independiente';
    });
    document.querySelectorAll('[data-bind="distributor.fullName"]').forEach(el => {
      el.textContent = cfg.distributor?.fullName || 'Jairo Pinto';
    });

    // 3. Hero Bindings
    const heroBadgeEl = document.querySelector('[data-bind="hero.badge"]');
    if (heroBadgeEl && cfg.hero?.badge) heroBadgeEl.textContent = cfg.hero.badge;

    const heroHeadlineEl = document.querySelector('[data-bind="hero.headline"]');
    if (heroHeadlineEl && cfg.hero?.headline) heroHeadlineEl.textContent = cfg.hero.headline;

    const heroSubheadlineEl = document.querySelector('[data-bind="hero.subheadline"]');
    if (heroSubheadlineEl && cfg.hero?.subheadline) heroSubheadlineEl.textContent = cfg.hero.subheadline;

    // 4. Social Proof Bar
    const proofAvatarsContainer = document.getElementById('proof-avatars');
    if (proofAvatarsContainer && cfg.socialProof?.avatars && Array.isArray(cfg.socialProof.avatars)) {
      proofAvatarsContainer.innerHTML = cfg.socialProof.avatars.map((url, i) => 
        `<img src="${url}" alt="Miembro ${i + 1}" class="proof-avatar-img">`
      ).join('');
    }
    const proofHeadlineEl = document.querySelector('[data-bind="socialProof.headline"]');
    if (proofHeadlineEl && cfg.socialProof?.headline) proofHeadlineEl.textContent = cfg.socialProof.headline;

    const proofSubheadlineEl = document.querySelector('[data-bind="socialProof.subheadline"]');
    if (proofSubheadlineEl && cfg.socialProof?.subheadline) proofSubheadlineEl.textContent = cfg.socialProof.subheadline;

    // 5. VSL Player Setup & 3D Tilt
    setupVslPlayer(cfg.vsl);

    // 6. WhatsApp & CTA Links
    const rawNumber = (cfg.distributor?.whatsappNumber || '').replace(/\D/g, '');
    const defaultMsg = cfg.distributor?.defaultMessage || 'Hola, vi la presentación del modelo de negocio en tu página web y quiero conocer cómo iniciar.';
    const waUrl = rawNumber ? `https://wa.me/${rawNumber}?text=${encodeURIComponent(defaultMsg)}` : (cfg.distributor?.ctaUrl || '#');
    const directRegisterUrl = cfg.cta?.directRegisterUrl || cfg.cta?.primaryUrl || waUrl;

    // CTAs Primarios (Registro Directo o WhatsApp)
    const ctaPrimaryLinks = document.querySelectorAll('.bind-cta-primary');
    ctaPrimaryLinks.forEach(link => {
      link.setAttribute('href', directRegisterUrl);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    const ctaPrimaryTextEls = document.querySelectorAll('[data-bind="cta.primaryText"]');
    ctaPrimaryTextEls.forEach(el => {
      if (cfg.cta?.primaryText) el.textContent = cfg.cta.primaryText;
    });

    // CTAs Secundarios (WhatsApp)
    const ctaSecondaryLinks = document.querySelectorAll('.bind-cta-secondary');
    ctaSecondaryLinks.forEach(link => {
      link.setAttribute('href', waUrl);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    const ctaSecondaryTextEls = document.querySelectorAll('[data-bind="cta.secondaryText"]');
    ctaSecondaryTextEls.forEach(el => {
      if (cfg.cta?.secondaryText) el.textContent = cfg.cta.secondaryText;
    });

    const guaranteeTextEl = document.querySelector('[data-bind="cta.guaranteeText"]');
    if (guaranteeTextEl && cfg.cta?.guaranteeText) guaranteeTextEl.textContent = cfg.cta.guaranteeText;

    // 7. Comparison Section
    if (cfg.comparison?.enabled !== false) {
      const compBadge = document.querySelector('[data-bind="comparison.badge"]');
      if (compBadge && cfg.comparison?.badge) compBadge.textContent = cfg.comparison.badge;

      const compTitle = document.querySelector('[data-bind="comparison.title"]');
      if (compTitle && cfg.comparison?.title) compTitle.textContent = cfg.comparison.title;

      const compSubtitle = document.querySelector('[data-bind="comparison.subtitle"]');
      if (compSubtitle && cfg.comparison?.subtitle) compSubtitle.textContent = cfg.comparison.subtitle;

      const tradTitle = document.querySelector('[data-bind="comparison.traditionalTitle"]');
      if (tradTitle && cfg.comparison?.traditionalTitle) tradTitle.textContent = cfg.comparison.traditionalTitle;

      const oppTitle = document.querySelector('[data-bind="comparison.opportunityTitle"]');
      if (oppTitle && cfg.comparison?.opportunityTitle) oppTitle.textContent = cfg.comparison.opportunityTitle;

      const tradList = document.getElementById('traditional-list');
      if (tradList && Array.isArray(cfg.comparison?.traditionalItems)) {
        tradList.innerHTML = cfg.comparison.traditionalItems.map(item => `
          <li class="comparison-list-item warning">
            <svg class="icon-svg comparison-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>${escapeHtml(item)}</span>
          </li>
        `).join('');
      }

      const oppList = document.getElementById('opportunity-list');
      if (oppList && Array.isArray(cfg.comparison?.opportunityItems)) {
        oppList.innerHTML = cfg.comparison.opportunityItems.map(item => `
          <li class="comparison-list-item success">
            <svg class="icon-svg comparison-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            <span>${escapeHtml(item)}</span>
          </li>
        `).join('');
      }
    }

    // 8. Benefits List (4 Pilares)
    const benefitsGrid = document.getElementById('benefits-grid');
    if (benefitsGrid && Array.isArray(cfg.benefits) && cfg.benefits.length > 0) {
      benefitsGrid.innerHTML = '';
      const items = cfg.benefits.slice(0, 4);
      items.forEach((benefit, idx) => {
        const card = document.createElement('div');
        card.className = 'benefit-card';
        const iconSvg = getBenefitIconSvg(idx, benefit.title);
        card.innerHTML = `
          <div class="benefit-icon-wrapper">
            ${iconSvg}
          </div>
          <h3>${escapeHtml(benefit.title)}</h3>
          <p>${escapeHtml(benefit.description)}</p>
        `;
        benefitsGrid.appendChild(card);
      });
    }

    // 9. Methodology Section (3 Pasos)
    const methodologyGrid = document.getElementById('methodology-grid');
    if (methodologyGrid && cfg.methodology?.steps && Array.isArray(cfg.methodology.steps)) {
      methodologyGrid.innerHTML = cfg.methodology.steps.slice(0, 3).map((step, idx) => `
        <div class="step-card">
          <div class="step-number">${escapeHtml(step.number || `0${idx + 1}`)}</div>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.description)}</p>
        </div>
      `).join('');
    }

    // 10. Testimonials
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid && cfg.testimonials?.items && Array.isArray(cfg.testimonials.items)) {
      testimonialsGrid.innerHTML = cfg.testimonials.items.slice(0, 4).map(testi => `
        <div class="testimonial-card">
          <p class="testimonial-quote">${escapeHtml(testi.quote)}</p>
          <div class="testimonial-user">
            ${testi.avatarUrl ? `<img src="${testi.avatarUrl}" alt="${escapeHtml(testi.name)}" class="testimonial-avatar">` : ''}
            <div class="testimonial-meta">
              <span class="testimonial-name">${escapeHtml(testi.name)}</span>
              <span class="testimonial-role">${escapeHtml(testi.role)}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // 11. FAQ Accordion
    const faqContainer = document.getElementById('faq-accordion');
    if (faqContainer && cfg.faq?.items && Array.isArray(cfg.faq.items)) {
      faqContainer.innerHTML = cfg.faq.items.map((item, idx) => `
        <div class="faq-item ${idx === 0 ? 'active' : ''}">
          <button class="faq-question-btn" type="button" aria-expanded="${idx === 0 ? 'true' : 'false'}">
            <span>${escapeHtml(item.question)}</span>
            <svg class="icon-svg faq-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="faq-answer">
            <p>${escapeHtml(item.answer)}</p>
          </div>
        </div>
      `).join('');

      // Event listener acordeón
      faqContainer.querySelectorAll('.faq-question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.faq-item');
          const isOpen = item.classList.contains('active');
          
          // Cerrar otros
          faqContainer.querySelectorAll('.faq-item').forEach(other => {
            other.classList.remove('active');
            other.querySelector('.faq-question-btn').setAttribute('aria-expanded', 'false');
          });

          // Alternar actual
          if (!isOpen) {
            item.classList.add('active');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });
    }

    // 12. Disclaimer Legal
    const disclaimerEl = document.querySelector('[data-bind="legal.disclaimer"]');
    if (disclaimerEl && cfg.legal?.disclaimer) {
      disclaimerEl.innerHTML = `<strong>Descargo de Responsabilidad:</strong> ${escapeHtml(cfg.legal.disclaimer)}`;
    }

    // 13. Footer Año
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
      footerYear.textContent = new Date().getFullYear().toString();
    }

    // 14. Modals Setup
    setupModals();
  }

  function setupVslPlayer(vslCfg) {
    const container = document.getElementById('vsl-video-container');
    if (!container) return;

    const embedUrl = vslCfg?.embedUrl || 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    const videoTitle = vslCfg?.videoTitle || 'Presentación de Negocio';

    if (vslCfg?.aspectRatio === '4:3') {
      container.classList.add('ratio-4-3');
    }

    if (vslCfg?.thumbnailUrl) {
      const thumb = document.getElementById('vsl-thumbnail');
      if (thumb) thumb.src = vslCfg.thumbnailUrl;
    }

    if (vslCfg?.durationText) {
      const durEl = document.querySelector('[data-bind="vsl.durationText"]');
      if (durEl) durEl.textContent = vslCfg.durationText;
    }

    // Reproducción al hacer click
    function playVideo() {
      if (container.classList.contains('playing')) return;
      
      const separator = embedUrl.includes('?') ? '&' : '?';
      const autoPlayUrl = `${embedUrl}${separator}autoplay=1&rel=0&modestbranding=1`;

      container.innerHTML = `
        <iframe 
          src="${autoPlayUrl}" 
          title="${videoTitle}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen 
          style="position: absolute; top:0; left:0; width:100%; height:100%; border:none; z-index: 20;">
        </iframe>
      `;

      container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      container.style.transition = 'transform 0.5s ease';
      container.classList.add('playing');
    }

    container.addEventListener('click', playVideo);

    // Efecto 3D Tilt interactivo
    container.addEventListener('mousemove', (e) => {
      if (container.classList.contains('playing')) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      const angleX = -(y - yc) / 22; 
      const angleY = (x - xc) / 22;
      
      container.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.015)`;
    });

    container.addEventListener('mouseleave', () => {
      if (container.classList.contains('playing')) return;
      container.style.transition = 'transform 0.5s ease';
      container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    });

    container.addEventListener('mouseenter', () => {
      if (container.classList.contains('playing')) return;
      container.style.transition = 'transform 0.1s ease';
    });
  }

  function setupModals() {
    const modalPrivacy = document.getElementById('modalPrivacy');
    const modalTerms = document.getElementById('modalTerms');
    const btnOpenPrivacy = document.getElementById('linkFooterPrivacy');
    const btnOpenTerms = document.getElementById('linkFooterTerms');
    const btnClosePrivacy = document.getElementById('btnClosePrivacy');
    const btnCloseTerms = document.getElementById('btnCloseTerms');

    function openModal(modal) {
      if (!modal) return;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (btnOpenPrivacy && modalPrivacy) {
      btnOpenPrivacy.addEventListener('click', () => openModal(modalPrivacy));
    }
    if (btnClosePrivacy && modalPrivacy) {
      btnClosePrivacy.addEventListener('click', () => closeModal(modalPrivacy));
    }

    if (btnOpenTerms && modalTerms) {
      btnOpenTerms.addEventListener('click', () => openModal(modalTerms));
    }
    if (btnCloseTerms && modalTerms) {
      btnCloseTerms.addEventListener('click', () => closeModal(modalTerms));
    }

    // Cerrar al hacer click fuera del contenedor
    [modalPrivacy, modalTerms].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(modalPrivacy);
        closeModal(modalTerms);
      }
    });
  }

  function renderBusinessVideoCarousel(cfg) {
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (!testimonialsGrid) return;

    let items = [];
    if (cfg.testimonials && cfg.testimonials.videoCarousel && Array.isArray(cfg.testimonials.videoCarousel.items)) {
      items = cfg.testimonials.videoCarousel.items.filter(url => url.startsWith('https://'));
    }

    // Fallback if empty or all filtered out
    if (items.length === 0) {
      const baseUrl = 'https://media.partnerhub.club/comunes/business/v1/testimonials/';
      items = Array.from({ length: 4 }, (_, index) => `${baseUrl}business-0${index + 1}.mp4`);
    }

    let baseItems = [...items];
    while (baseItems.length < 12) {
      baseItems = [...baseItems, ...items];
    }
    const doubleVideos = [...baseItems, ...baseItems];

    testimonialsGrid.className = 'business-video-carousel';
    testimonialsGrid.textContent = ''; // Limpieza segura

    const track = document.createElement('div');
    track.className = 'business-video-track';

    doubleVideos.forEach((src, index) => {
      const card = document.createElement('div');
      card.className = 'business-video-card';
      card.dataset.videoIndex = index + 1;

      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.src = src; // Inserción DOM segura

      const playOverlay = document.createElement('div');
      playOverlay.className = 'business-video-play';
      playOverlay.setAttribute('aria-hidden', 'true');
      playOverlay.innerHTML = '<span>▶</span>';

      card.appendChild(video);
      card.appendChild(playOverlay);
      track.appendChild(card);
    });

    testimonialsGrid.appendChild(track);

    testimonialsGrid.querySelectorAll('video').forEach((video) => {
      video.play().catch(() => {});
    });
  }

  async function startDecisionMomentum(cfg) {
    const dmConfig = cfg.decisionMomentum;
    if (!dmConfig || !dmConfig.enabled) return;

    let items = dmConfig.messages || [];

    // Validar HTTPS en feedUrl y fallback
    if (dmConfig.feedUrl && dmConfig.feedUrl.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(dmConfig.feedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            items = data;
          }
        }
      } catch (err) {
        console.warn('Fallo al cargar feedUrl de Decision Momentum, usando fallback local.');
      }
    }

    if (items.length === 0) return;

    const toast = document.createElement('aside');
    toast.className = 'momentum-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="momentum-toast-label"><span class="momentum-toast-dot"></span><span data-role="label"></span></div>
      <div class="momentum-toast-text" data-role="text"></div>
      <div class="momentum-toast-footnote">${escapeHtml(dmConfig.disclaimer || '')}</div>
    `;
    document.body.appendChild(toast);

    const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    let lastIndex = -1;

    const getNextItem = () => {
      if (items.length === 1) return items[0];
      let nextIndex = randomBetween(0, items.length - 1);
      if (nextIndex === lastIndex) {
        nextIndex = (nextIndex + 1) % items.length;
      }
      lastIndex = nextIndex;
      return items[nextIndex];
    };

    const getNextDelay = () => {
      if (Math.random() < (dmConfig.occasionalPauseChance || 0.22)) {
        return randomBetween(dmConfig.occasionalPauseMinMs || 45000, dmConfig.occasionalPauseMaxMs || 90000);
      }
      return randomBetween(dmConfig.intervalMinMs || 12000, dmConfig.intervalMaxMs || 28000);
    };

    const showNext = () => {
      if (document.hidden) {
        window.setTimeout(showNext, getNextDelay());
        return;
      }

      const item = getNextItem();
      toast.querySelector('[data-role="label"]').textContent = item.label;
      toast.querySelector('[data-role="text"]').textContent = item.text;
      toast.classList.add('is-visible');

      window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(showNext, getNextDelay());
      }, dmConfig.visibleMs || 5200);
    };

    window.setTimeout(showNext, randomBetween(2500, 5000));
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', function () {
    const config = window.CONFIG || {};
    applyTheme(config.theme);
    renderDynamicContent(config);
    renderBusinessVideoCarousel(config);
    startDecisionMomentum(config);
  });
})();
