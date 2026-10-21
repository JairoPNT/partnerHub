/**
 * app.js - PartnerHub Business / VSL Template Controller
 * Renderiza configuración y el perfil validado window.CONFIG.businessLandingContent
 * mediante creación de nodos DOM y textContent, manteniendo aviso fijo, CTAs de WhatsApp
 * y VSL visible sin duración no verificada.
 */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEFAULT_HERO_DESKTOP = 'https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp';
  const DEFAULT_HERO_MOBILE = 'https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp';
  const DEFAULT_VSL_TITLE = 'Ver presentación de negocio';
  const DEFAULT_VSL_CAPTION = 'Presentación informativa · Activa el sonido para una mejor experiencia';
  const DEFAULT_DEDICATION_TEXT =
    'La dedicación para desarrollar la actividad depende de tus objetivos y tareas; no garantiza resultados.';
  const ALLOWED_CTA_LABELS = new Set(['Hablar por WhatsApp', 'Conocer la oportunidad']);

  const PROHIBITED_COPY_RE = new RegExp(
    [
      ['libertad', 'financiera'].join('\\s+'),
      ['ingresos', 'residuales', 'sostenibles'].join('\\s+'),
      ['ganas', 'cada', 'vez', 'que', 'alguien', 'toma', 'cafe'].join('\\s+'),
      ['resultados', 'desde', 'las', 'primeras', 'semanas'].join('\\s+'),
      ['cero', 'inventarios'].join('\\s+'),
      ['logistica', '100%', 'cubierta'].join('\\s+'),
      '(?:formacion|capacitacion)[\\s\\S]*sin\\s+costo',
      ['presencia', 'internacional'].join('\\s+'),
      'registros?\\s+sanitarios?',
      ['respaldo', 'financiero'].join('\\s+'),
      ['cupos', 'limitados'].join('\\s+'),
      ['asegura', 'tu', 'posicion'].join('\\s+'),
      ['8', 'a', '12', 'horas'].join('\\s+')
    ].join('|')
  );

  const MANDATORY_DISCLOSURE_TITLE = 'Aviso Importante sobre la Actividad';
  const MANDATORY_DISCLOSURE_POINTS = [
    'Es una actividad independiente de venta directa; no es una oferta de empleo ni constituye relación laboral o salario fijo.',
    'Requiere inversión para compra inicial de producto y trabajo comercial constante.',
    'Incluye acompañamiento formativo desde el inicio; los resultados dependen del esfuerzo individual y no están garantizados.'
  ];

  // 1. Mapeo de Presets Oficiales de Paleta (PH-025)
  const PALETTE_MAP = {
    'cobalt-cyan': { base: '#0F172A', accent: '#06B6D4', hover: '#0891B2', bgSecondary: '#111827', textOnAccent: '#0F172A' },
    'emerald-slate': { base: '#022C22', accent: '#10B981', hover: '#059669', bgSecondary: '#064E3B', textOnAccent: '#022C22' },
    'coffee-gold': { base: '#271C19', accent: '#D97706', hover: '#B45309', bgSecondary: '#3C2A21', textOnAccent: '#FFFFFF' },
    'rose-graphite': { base: '#18181B', accent: '#F43F5E', hover: '#E11D48', bgSecondary: '#27272A', textOnAccent: '#FFFFFF' },
    'indigo-lime': { base: '#0F2942', accent: '#84CC16', hover: '#65A30D', bgSecondary: '#163A5F', textOnAccent: '#0F2942' },
    'teal-navy': { base: '#0A192F', accent: '#14B8A6', hover: '#0D9488', bgSecondary: '#112240', textOnAccent: '#0A192F' },
    'wine-blush': { base: '#2A0813', accent: '#FB7185', hover: '#F43F5E', bgSecondary: '#4C0519', textOnAccent: '#2A0813' },
    'forest-mint': { base: '#052E16', accent: '#34D399', hover: '#10B981', bgSecondary: '#064E3B', textOnAccent: '#052E16' },
    'charcoal-amber': { base: '#171717', accent: '#F59E0B', hover: '#D97706', bgSecondary: '#262626', textOnAccent: '#171717' },
    'sky-stone': { base: '#0C4A6E', accent: '#38BDF8', hover: '#0284C7', bgSecondary: '#075985', textOnAccent: '#0C4A6E' }
  };

  // 2. Mapeo de Presets Oficiales de Fuentes (PH-025)
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

  function normalizeCopy(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function hasControlChars(value) {
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
        return true;
      }
    }
    return false;
  }

  function validateSafeText(value, maxLength) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > maxLength) return null;
    if (hasControlChars(trimmed)) return null;
    if (PROHIBITED_COPY_RE.test(normalizeCopy(trimmed))) return null;
    return trimmed;
  }

  function isApprovedBusinessMediaUrl(value) {
    if (typeof value !== 'string') return false;
    if (!/^https:\/\/media\.partnerhub\.club\/comunes\/business\/[a-zA-Z0-9_./-]+$/.test(value)) {
      return false;
    }
    const path = value.slice('https://media.partnerhub.club'.length);
    if (path.endsWith('/')) return false;
    return !path.split('/').some((segment) => segment === '.' || segment === '..');
  }

  function resolveValidatedProfile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) {
      return null;
    }

    const heroObj = rawProfile.hero && typeof rawProfile.hero === 'object' ? rawProfile.hero : {};
    const headline = validateSafeText(heroObj.headline, 160);
    const subheadline = validateSafeText(heroObj.subheadline, 400);
    const desktopImageUrl = isApprovedBusinessMediaUrl(heroObj.desktopImageUrl)
      ? heroObj.desktopImageUrl
      : null;
    const mobileImageUrl = isApprovedBusinessMediaUrl(heroObj.mobileImageUrl)
      ? heroObj.mobileImageUrl
      : null;

    let benefits = null;
    if (Array.isArray(rawProfile.benefits) && rawProfile.benefits.length >= 1 && rawProfile.benefits.length <= 4) {
      const parsedBenefits = [];
      for (const item of rawProfile.benefits) {
        if (!item || typeof item !== 'object') {
          parsedBenefits.length = 0;
          break;
        }
        const title = validateSafeText(item.title, 80);
        const description = validateSafeText(item.description, 240);
        if (!title || !description) {
          parsedBenefits.length = 0;
          break;
        }
        parsedBenefits.push({ title, description });
      }
      if (parsedBenefits.length > 0) {
        benefits = parsedBenefits;
      }
    }

    const themeObj = rawProfile.theme && typeof rawProfile.theme === 'object' ? rawProfile.theme : {};
    const fontPreset = typeof themeObj.fontPreset === 'string' && Object.prototype.hasOwnProperty.call(FONT_MAP, themeObj.fontPreset)
      ? themeObj.fontPreset
      : null;
    const palettePreset = typeof themeObj.palettePreset === 'string' && Object.prototype.hasOwnProperty.call(PALETTE_MAP, themeObj.palettePreset)
      ? themeObj.palettePreset
      : null;

    const dedicationText = validateSafeText(rawProfile.dedicationText, 300);

    return {
      hero: { headline, subheadline, desktopImageUrl, mobileImageUrl },
      benefits,
      theme: { fontPreset, palettePreset },
      dedicationText
    };
  }

  function applyTheme(baseTheme, profileTheme) {
    const root = document.documentElement;
    const paletteKey =
      (profileTheme && profileTheme.palettePreset) ||
      (baseTheme && Object.prototype.hasOwnProperty.call(PALETTE_MAP, baseTheme.palettePreset) ? baseTheme.palettePreset : 'cobalt-cyan');
    const fontKey =
      (profileTheme && profileTheme.fontPreset) ||
      (baseTheme && Object.prototype.hasOwnProperty.call(FONT_MAP, baseTheme.fontPreset) ? baseTheme.fontPreset : 'executive');

    const palette = PALETTE_MAP[paletteKey] || PALETTE_MAP['cobalt-cyan'];
    root.setAttribute('data-palette', paletteKey);
    root.setAttribute('data-font', fontKey);
    root.style.setProperty('--accent-base', palette.base);
    root.style.setProperty('--accent-color', palette.accent);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--bg-secondary', palette.bgSecondary);
    root.style.setProperty('--text-on-accent', palette.textOnAccent);
    root.style.setProperty('--accent-glow', palette.accent + '40');
    root.style.setProperty('--accent-subtle', palette.accent + '1A');
    root.style.setProperty('--border-focus', palette.accent + '80');

    const font = FONT_MAP[fontKey] || FONT_MAP['executive'];
    root.style.setProperty('--font-title', font.title);
    root.style.setProperty('--font-body', font.body);
  }

  function createSvgElement(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function createBenefitIconNode(index, title) {
    const t = String(title || '').toLowerCase();
    const svg = createSvgElement('svg', {
      class: 'icon-svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });

    if (t.includes('socio') || t.includes('autonom') || index === 0) {
      svg.appendChild(createSvgElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }));
      return svg;
    }
    if (t.includes('consumo') || t.includes('producto') || t.includes('hábito') || t.includes('café') || index === 1) {
      svg.appendChild(createSvgElement('path', { d: 'M18 8h1a4 4 0 0 1 0 8h-1' }));
      svg.appendChild(createSvgElement('path', { d: 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' }));
      svg.appendChild(createSvgElement('line', { x1: '6', y1: '1', x2: '6', y2: '4' }));
      svg.appendChild(createSvgElement('line', { x1: '10', y1: '1', x2: '10', y2: '4' }));
      svg.appendChild(createSvgElement('line', { x1: '14', y1: '1', x2: '14', y2: '4' }));
      return svg;
    }
    if (t.includes('horario') || t.includes('acompaña') || t.includes('logística') || index === 2) {
      svg.appendChild(createSvgElement('rect', { width: '20', height: '14', x: '2', y: '5', rx: '2' }));
      svg.appendChild(createSvgElement('line', { x1: '2', x2: '22', y1: '10', y2: '10' }));
      return svg;
    }
    svg.appendChild(createSvgElement('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }));
    svg.appendChild(createSvgElement('circle', { cx: '9', cy: '7', r: '4' }));
    svg.appendChild(createSvgElement('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }));
    svg.appendChild(createSvgElement('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }));
    return svg;
  }

  function createComparisonIconNode(type) {
    const svg = createSvgElement('svg', {
      class: 'icon-svg comparison-item-icon',
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': type === 'success' ? '2.5' : '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    if (type === 'success') {
      svg.appendChild(createSvgElement('path', { d: 'M20 6 9 17l-5-5' }));
    } else {
      svg.appendChild(createSvgElement('circle', { cx: '12', cy: '12', r: '10' }));
      svg.appendChild(createSvgElement('line', { x1: '15', y1: '9', x2: '9', y2: '15' }));
      svg.appendChild(createSvgElement('line', { x1: '9', y1: '9', x2: '15', y2: '15' }));
    }
    return svg;
  }

  function clearNode(node) {
    if (!node) return;
    node.textContent = '';
  }

  function renderComparisonList(listEl, items, type) {
    if (!listEl || !Array.isArray(items)) return;
    clearNode(listEl);
    items.forEach((item) => {
      const safeItem = validateSafeText(item, 300);
      if (!safeItem) return;
      const li = document.createElement('li');
      li.className = `comparison-list-item ${type}`;
      li.appendChild(createComparisonIconNode(type));
      const span = document.createElement('span');
      span.textContent = safeItem;
      li.appendChild(span);
      listEl.appendChild(li);
    });
  }

  function resolveFallbackBenefits(cfgBenefits) {
    if (!Array.isArray(cfgBenefits) || cfgBenefits.length === 0) return [];
    const safeItems = [];
    for (const item of cfgBenefits.slice(0, 4)) {
      if (!item || typeof item !== 'object') continue;
      const title = validateSafeText(item.title, 120);
      const description = validateSafeText(item.description, 320);
      if (title && description) {
        safeItems.push({ title, description });
      }
    }
    return safeItems;
  }

  function resolveEffectiveDedicationText(profile, cfgFaq) {
    if (profile && profile.dedicationText) {
      return profile.dedicationText;
    }
    if (cfgFaq && Array.isArray(cfgFaq.items)) {
      const dedicationItem = cfgFaq.items.find(
        (item) =>
          item &&
          (item.id === 'f2' ||
            normalizeCopy(item.question).includes('cuanto tiempo debo dedicarle a la semana'))
      );
      const safeAnswer = dedicationItem ? validateSafeText(dedicationItem.answer, 300) : null;
      if (safeAnswer) return safeAnswer;
    }
    return DEFAULT_DEDICATION_TEXT;
  }

  function renderDynamicContent(cfg, profile) {
    if (!cfg) return;

    // 1. Meta / SEO
    if (cfg.site) {
      const safeTitle = validateSafeText(cfg.site.title, 180);
      if (safeTitle) document.title = safeTitle;

      const metaDesc = document.querySelector('meta[name="description"]');
      const safeMetaDesc = validateSafeText(cfg.site.metaDescription, 320);
      if (metaDesc && safeMetaDesc) metaDesc.setAttribute('content', safeMetaDesc);

      const ogTitle = document.querySelector('meta[property="og:title"]');
      const safeOgTitle = validateSafeText(cfg.site.ogTitle, 180);
      if (ogTitle && safeOgTitle) ogTitle.setAttribute('content', safeOgTitle);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      const safeOgDesc = validateSafeText(cfg.site.ogDescription, 320);
      if (ogDesc && safeOgDesc) ogDesc.setAttribute('content', safeOgDesc);
    }

    // 2. Brand & Header Bindings (Derivados del partner o vacíos en master)
    const brandName = typeof cfg.distributor?.brandName === 'string' ? cfg.distributor.brandName.trim() : '';
    const brandRole = typeof cfg.distributor?.role === 'string' ? cfg.distributor.role.trim() : '';
    const fullName = typeof cfg.distributor?.fullName === 'string' ? cfg.distributor.fullName.trim() : '';

    document.querySelectorAll('[data-bind="distributor.brandName"]').forEach((el) => {
      el.textContent = brandName;
    });
    document.querySelectorAll('[data-bind="distributor.role"]').forEach((el) => {
      el.textContent = brandRole;
    });
    document.querySelectorAll('[data-bind="distributor.fullName"]').forEach((el) => {
      el.textContent = fullName;
    });
    document.querySelectorAll('[data-bind="distributor.legalIdentity"]').forEach((el) => {
      el.textContent = fullName ? `${fullName} como distribuidor independiente` : 'un distribuidor independiente';
    });

    const brandBadge = document.querySelector('.brand-badge');
    if (brandBadge) {
      brandBadge.style.visibility = !brandName && !brandRole && !fullName ? 'hidden' : 'visible';
    }

    const contactProfileInfo = document.querySelector('.contact-profile-info');
    if (contactProfileInfo) {
      contactProfileInfo.style.display = !fullName && !brandRole ? 'none' : '';
    }

    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand) {
      footerBrand.style.display = !fullName && !brandName ? 'none' : '';
    }

    // 3. Hero Bindings (Precedencia: businessLandingContent validado > config seguro > fallback)
    const heroBadgeEl = document.querySelector('[data-bind="hero.badge"]');
    const safeHeroBadge = validateSafeText(cfg.hero?.badge, 120);
    if (heroBadgeEl && safeHeroBadge) heroBadgeEl.textContent = safeHeroBadge;

    const heroHeadlineEl = document.querySelector('[data-bind="hero.headline"]');
    const effectiveHeadline =
      (profile && profile.hero.headline) ||
      validateSafeText(cfg.hero?.headline, 160) ||
      'Desarrolla una Actividad de Venta Directa con Acompañamiento';
    if (heroHeadlineEl) heroHeadlineEl.textContent = effectiveHeadline;

    const heroSubheadlineEl = document.querySelector('[data-bind="hero.subheadline"]');
    const effectiveSubheadline =
      (profile && profile.hero.subheadline) ||
      validateSafeText(cfg.hero?.subheadline, 400) ||
      'Conoce una propuesta de distribución independiente enfocada en autonomía, aprendizaje práctico y desarrollo de habilidades comerciales a tu propio ritmo.';
    if (heroSubheadlineEl) heroSubheadlineEl.textContent = effectiveSubheadline;

    const desktopHeroUrl =
      (profile && profile.hero.desktopImageUrl) ||
      (isApprovedBusinessMediaUrl(cfg.hero?.desktop) ? cfg.hero.desktop : null) ||
      (isApprovedBusinessMediaUrl(cfg.hero?.desktopBgUrl) ? cfg.hero.desktopBgUrl : null) ||
      DEFAULT_HERO_DESKTOP;
    const mobileHeroUrl =
      (profile && profile.hero.mobileImageUrl) ||
      (isApprovedBusinessMediaUrl(cfg.hero?.mobile) ? cfg.hero.mobile : null) ||
      (isApprovedBusinessMediaUrl(cfg.hero?.mobileBgUrl) ? cfg.hero.mobileBgUrl : null) ||
      DEFAULT_HERO_MOBILE;

    const heroSection = document.getElementById('hero-vsl');
    if (heroSection) {
      heroSection.setAttribute('data-hero-desktop-image', desktopHeroUrl);
      heroSection.setAttribute('data-hero-mobile-image', mobileHeroUrl);
      heroSection.style.setProperty('--hero-desktop-bg', `url("${desktopHeroUrl}")`);
      heroSection.style.setProperty('--hero-mobile-bg', `url("${mobileHeroUrl}")`);
    }

    // 4. Optional Claims & Social Proof (Desactivados por defecto hasta verificación)
    const trustRow = document.getElementById('trustHighlightsRow');
    if (trustRow) {
      trustRow.hidden = true;
      trustRow.style.display = 'none';
    }

    const proofContainer = document.getElementById('hero-social-proof');
    if (proofContainer) {
      proofContainer.hidden = true;
      proofContainer.style.display = 'none';
    }

    // 5. VSL Player Setup (Visible con título genérico y sin duración no verificada)
    setupVslPlayer(cfg.vsl);

    // 6. Aviso obligatorio cerca al CTA principal (Fijo y no removible)
    const effectiveDedicationText = resolveEffectiveDedicationText(profile, cfg.faq);
    const modelNoticeBox = document.getElementById('heroModelNotice');
    if (modelNoticeBox) {
      modelNoticeBox.hidden = false;
      modelNoticeBox.style.display = '';

      const noticeTitleEl = document.getElementById('modelNoticeTitle');
      if (noticeTitleEl) {
        noticeTitleEl.textContent = MANDATORY_DISCLOSURE_TITLE;
      }

      const noticeListEl = document.getElementById('modelNoticeList');
      if (noticeListEl) {
        clearNode(noticeListEl);
        MANDATORY_DISCLOSURE_POINTS.forEach((pointText) => {
          const li = document.createElement('li');
          const checkSvg = createSvgElement('svg', {
            class: 'icon-svg check-icon',
            width: '14',
            height: '14',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2.5',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
          });
          checkSvg.appendChild(createSvgElement('polyline', { points: '20 6 9 17 4 12' }));
          const span = document.createElement('span');
          span.textContent = pointText;
          li.appendChild(checkSvg);
          li.appendChild(span);
          noticeListEl.appendChild(li);
        });
      }
    }

    const heroDedicationEl = document.getElementById('heroDedicationText');
    if (heroDedicationEl) {
      // The shared hero must not inherit a partner-specific FAQ dedication.
      heroDedicationEl.textContent = (profile && profile.dedicationText) || DEFAULT_DEDICATION_TEXT;
    }

    // 7. WhatsApp & CTA Links (Solo etiquetas de intención de WhatsApp y destino WhatsApp)
    const rawNumber = String(cfg.distributor?.whatsappNumber || '').replace(/\D/g, '');
    const defaultMsg =
      (typeof cfg.distributor?.defaultMessage === 'string' && cfg.distributor.defaultMessage.trim()) ||
      'Hola, vi la presentación de negocio en tu página web y quiero conocer la oportunidad.';

    const isSafeWaUrl = (url) =>
      typeof url === 'string' && /^https:\/\/(?:wa\.me\/|api\.whatsapp\.com\/)/i.test(url.trim());

    const serverPrimaryWaUrl = isSafeWaUrl(cfg.cta?.primaryUrl) ? cfg.cta.primaryUrl.trim() : '';
    const serverSecondaryWaUrl = isSafeWaUrl(cfg.cta?.secondaryUrl) ? cfg.cta.secondaryUrl.trim() : '';
    const derivedWaUrl =
      rawNumber.length >= 10 && rawNumber.length <= 15
        ? `https://wa.me/${rawNumber}?text=${encodeURIComponent(defaultMsg)}`
        : '';

    const primaryWaUrl = serverPrimaryWaUrl || derivedWaUrl || '#contacto';
    const secondaryWaUrl = serverSecondaryWaUrl || primaryWaUrl;

    const rawPrimaryLabel = typeof cfg.cta?.primaryText === 'string' ? cfg.cta.primaryText.trim() : '';
    const rawSecondaryLabel = typeof cfg.cta?.secondaryText === 'string' ? cfg.cta.secondaryText.trim() : '';
    const rawHeaderLabel = typeof cfg.cta?.headerBtnText === 'string' ? cfg.cta.headerBtnText.trim() : '';

    const primaryLabel = ALLOWED_CTA_LABELS.has(rawPrimaryLabel) ? rawPrimaryLabel : 'Hablar por WhatsApp';
    const secondaryLabel = ALLOWED_CTA_LABELS.has(rawSecondaryLabel) ? rawSecondaryLabel : 'Conocer la oportunidad';
    const headerLabel = ALLOWED_CTA_LABELS.has(rawHeaderLabel) ? rawHeaderLabel : primaryLabel;

    document.querySelectorAll('.bind-cta-primary').forEach((link) => {
      link.setAttribute('href', primaryWaUrl);
      if (primaryWaUrl.startsWith('#')) {
        link.removeAttribute('target');
        link.removeAttribute('rel');
      } else {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });

    document.querySelectorAll('[data-bind="cta.primaryText"]').forEach((el) => {
      el.textContent = primaryLabel;
    });

    document.querySelectorAll('[data-bind="cta.headerBtnText"]').forEach((el) => {
      el.textContent = headerLabel;
    });

    document.querySelectorAll('.bind-cta-secondary').forEach((link) => {
      link.setAttribute('href', secondaryWaUrl);
      if (secondaryWaUrl.startsWith('#')) {
        link.removeAttribute('target');
        link.removeAttribute('rel');
      } else {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });

    document.querySelectorAll('[data-bind="cta.secondaryText"]').forEach((el) => {
      el.textContent = secondaryLabel;
    });

    const guaranteeTextEl = document.querySelector('[data-bind="cta.guaranteeText"]');
    if (guaranteeTextEl) {
      const safeGuarantee = validateSafeText(cfg.cta?.guaranteeText, 180);
      guaranteeTextEl.textContent =
        safeGuarantee ||
        (fullName
          ? `Orientación informativa directa por WhatsApp con ${fullName} · Sin compromiso`
          : 'Orientación informativa directa por WhatsApp · Sin compromiso');
    }

    // 8. Comparison Section
    if (cfg.comparison?.enabled !== false) {
      const compBadge = document.querySelector('[data-bind="comparison.badge"]');
      const safeCompBadge = validateSafeText(cfg.comparison?.badge, 120);
      if (compBadge && safeCompBadge) compBadge.textContent = safeCompBadge;

      const compTitle = document.querySelector('[data-bind="comparison.title"]');
      const safeCompTitle = validateSafeText(cfg.comparison?.title, 180);
      if (compTitle && safeCompTitle) compTitle.textContent = safeCompTitle;

      const compSubtitle = document.querySelector('[data-bind="comparison.subtitle"]');
      const safeCompSubtitle = validateSafeText(cfg.comparison?.subtitle, 320);
      if (compSubtitle && safeCompSubtitle) compSubtitle.textContent = safeCompSubtitle;

      const tradTitle = document.querySelector('[data-bind="comparison.traditionalTitle"]');
      const safeTradTitle = validateSafeText(cfg.comparison?.traditionalTitle, 140);
      if (tradTitle && safeTradTitle) tradTitle.textContent = safeTradTitle;

      const oppTitle = document.querySelector('[data-bind="comparison.opportunityTitle"]');
      const safeOppTitle = validateSafeText(cfg.comparison?.opportunityTitle, 140);
      if (oppTitle && safeOppTitle) oppTitle.textContent = safeOppTitle;

      renderComparisonList(document.getElementById('traditional-list'), cfg.comparison?.traditionalItems, 'warning');
      renderComparisonList(document.getElementById('opportunity-list'), cfg.comparison?.opportunityItems, 'success');
    }

    // 9. Benefits List (1–4 Pilares desde businessLandingContent o fallback seguro)
    const benefitsGrid = document.getElementById('benefits-grid');
    const effectiveBenefits =
      (profile && profile.benefits) ||
      resolveFallbackBenefits(cfg.benefits);

    if (benefitsGrid && effectiveBenefits.length > 0) {
      clearNode(benefitsGrid);
      const colors = [
        { hex: '#38BDF8', rgb: '56, 189, 248' },
        { hex: '#84CC16', rgb: '132, 204, 22' },
        { hex: '#10B981', rgb: '16, 185, 129' },
        { hex: '#60A5FA', rgb: '96, 165, 250' }
      ];

      effectiveBenefits.slice(0, 4).forEach((benefit, idx) => {
        const card = document.createElement('div');
        card.className = 'feature-dashed-card';
        const color = colors[idx % colors.length];
        card.style.setProperty('--benefit-color', color.hex);
        card.style.setProperty('--benefit-color-rgb', color.rgb);

        const content = document.createElement('div');
        content.className = 'feature-card-content';

        const header = document.createElement('div');
        header.className = 'feature-card-header';

        const iconWrap = document.createElement('div');
        iconWrap.className = 'feature-icon';
        iconWrap.appendChild(createBenefitIconNode(idx, benefit.title));

        const numSpan = document.createElement('span');
        numSpan.className = 'feature-card-num';
        numSpan.textContent = `0${idx + 1}`;

        header.appendChild(iconWrap);
        header.appendChild(numSpan);

        const titleEl = document.createElement('h3');
        titleEl.className = 'feature-title text-primary font-serif';
        titleEl.textContent = benefit.title;

        const descEl = document.createElement('p');
        descEl.className = 'feature-desc text-secondary';
        descEl.textContent = benefit.description;

        content.appendChild(header);
        content.appendChild(titleEl);
        content.appendChild(descEl);
        card.appendChild(content);
        benefitsGrid.appendChild(card);
      });
    }

    // 10. Methodology Section (3 Pasos)
    const methodologyGrid = document.getElementById('methodology-grid');
    if (methodologyGrid && Array.isArray(cfg.methodology?.steps)) {
      clearNode(methodologyGrid);
      cfg.methodology.steps.slice(0, 3).forEach((step, idx) => {
        const safeStepTitle = validateSafeText(step?.title, 120);
        const safeStepDesc = validateSafeText(step?.description, 320);
        if (!safeStepTitle || !safeStepDesc) return;

        const card = document.createElement('div');
        card.className = 'step-card';

        const num = document.createElement('div');
        num.className = 'step-number';
        num.textContent = validateSafeText(step?.number, 10) || `0${idx + 1}`;

        const h3 = document.createElement('h3');
        h3.textContent = safeStepTitle;

        const p = document.createElement('p');
        p.textContent = safeStepDesc;

        card.appendChild(num);
        card.appendChild(h3);
        card.appendChild(p);
        methodologyGrid.appendChild(card);
      });
    }

    // 11. Testimonials & Success Navigation (Desactivados por defecto hasta verificación)
    const testimonialsSection = document.getElementById('testimonios');
    const testimonialsNavLink = document.querySelector('a.header-link[href="#testimonios"]');
    if (testimonialsSection) {
      testimonialsSection.hidden = true;
      testimonialsSection.style.display = 'none';
    }
    if (testimonialsNavLink) {
      testimonialsNavLink.hidden = true;
      testimonialsNavLink.style.display = 'none';
    }

    // 12. FAQ Accordion (Respeta businessLandingContent.dedicationText en la pregunta de dedicación semanal)
    const faqContainer = document.getElementById('faq-accordion');
    if (faqContainer && Array.isArray(cfg.faq?.items)) {
      clearNode(faqContainer);
      cfg.faq.items.forEach((item, idx) => {
        const safeQuestion = validateSafeText(item?.question, 200);
        if (!safeQuestion) return;

        const isDedicationFaq =
          item.id === 'f2' ||
          normalizeCopy(safeQuestion).includes('cuanto tiempo debo dedicarle a la semana');
        const safeAnswer = isDedicationFaq
          ? effectiveDedicationText
          : validateSafeText(item?.answer, 400);
        if (!safeAnswer) return;

        const faqItem = document.createElement('div');
        faqItem.className = idx === 0 ? 'faq-item active' : 'faq-item';

        const btn = document.createElement('button');
        btn.className = 'faq-question-btn';
        btn.type = 'button';
        btn.setAttribute('aria-expanded', idx === 0 ? 'true' : 'false');

        const qSpan = document.createElement('span');
        qSpan.textContent = safeQuestion;

        const chevron = createSvgElement('svg', {
          class: 'icon-svg faq-icon',
          width: '18',
          height: '18',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        });
        chevron.appendChild(createSvgElement('polyline', { points: '6 9 12 15 18 9' }));

        btn.appendChild(qSpan);
        btn.appendChild(chevron);

        const ansDiv = document.createElement('div');
        ansDiv.className = 'faq-answer';
        const ansP = document.createElement('p');
        ansP.textContent = safeAnswer;
        ansDiv.appendChild(ansP);

        btn.addEventListener('click', () => {
          const isOpen = faqItem.classList.contains('active');
          faqContainer.querySelectorAll('.faq-item').forEach((other) => {
            other.classList.remove('active');
            const otherBtn = other.querySelector('.faq-question-btn');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          });
          if (!isOpen) {
            faqItem.classList.add('active');
            btn.setAttribute('aria-expanded', 'true');
          }
        });

        faqItem.appendChild(btn);
        faqItem.appendChild(ansDiv);
        faqContainer.appendChild(faqItem);
      });
    }

    // 13. Disclaimer Legal (Sin innerHTML)
    const disclaimerEl = document.querySelector('[data-bind="legal.disclaimer"]');
    const safeDisclaimer = validateSafeText(cfg.legal?.disclaimer, 900);
    if (disclaimerEl && safeDisclaimer) {
      clearNode(disclaimerEl);
      const strong = document.createElement('strong');
      strong.textContent = 'Descargo de Responsabilidad: ';
      const textSpan = document.createElement('span');
      textSpan.textContent = safeDisclaimer.replace(/^Descargo de Responsabilidad:\s*/i, '');
      disclaimerEl.appendChild(strong);
      disclaimerEl.appendChild(textSpan);
    }

    // 14. Footer Año
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
      footerYear.textContent = new Date().getFullYear().toString();
    }

    // 15. Modals Setup
    setupModals();
  }

  function isDirectVideoUrl(provider, url) {
    if (provider === 'custom' || provider === 'mp4' || provider === 'video') return true;
    if (!url) return false;
    return /\.(mp4|webm|ogg|m4v)($|\?)/i.test(url);
  }

  function isSafeHttpsUrl(value) {
    if (typeof value !== 'string') return false;
    return /^https:\/\/[^\s"'<>]+$/i.test(value.trim());
  }

  function setupVslPlayer(vslCfg) {
    const container = document.getElementById('vsl-video-container');
    if (!container) return;

    const provider = vslCfg?.provider || 'custom';
    const embedUrl = isSafeHttpsUrl(vslCfg?.embedUrl) ? vslCfg.embedUrl.trim() : '';
    const videoTitle = validateSafeText(vslCfg?.videoTitle, 120) || DEFAULT_VSL_TITLE;

    if (vslCfg?.aspectRatio === '4:3') {
      container.classList.add('ratio-4-3');
    }

    if (isSafeHttpsUrl(vslCfg?.thumbnailUrl)) {
      const thumb = document.getElementById('vsl-thumbnail');
      if (thumb) thumb.setAttribute('src', vslCfg.thumbnailUrl.trim());
    }

    // Mostrar duración solo si está verificada contra el medio cargado; de lo contrario título genérico
    const durEl = document.querySelector('[data-bind="vsl.durationText"]');
    if (durEl) {
      const verifiedDuration =
        vslCfg?.durationVerified === true ? validateSafeText(vslCfg?.durationText, 80) : null;
      durEl.textContent = verifiedDuration || DEFAULT_VSL_TITLE;
    }

    const captionEl = document.querySelector('[data-bind="vsl.caption"]');
    if (captionEl) {
      const rawCaption = validateSafeText(vslCfg?.caption, 180);
      const hasUnverifiedMinutes = rawCaption && /\b\d+\s*min/i.test(rawCaption) && vslCfg?.durationVerified !== true;
      const hasOfficialClaim = rawCaption && /oficial/i.test(rawCaption);
      captionEl.textContent =
        rawCaption && !hasUnverifiedMinutes && !hasOfficialClaim ? rawCaption : DEFAULT_VSL_CAPTION;
    }

    function playVideo() {
      if (container.classList.contains('playing')) return;
      if (!embedUrl) return;

      clearNode(container);

      if (isDirectVideoUrl(provider, embedUrl)) {
        const videoEl = document.createElement('video');
        videoEl.setAttribute('src', embedUrl);
        if (isSafeHttpsUrl(vslCfg?.thumbnailUrl)) {
          videoEl.setAttribute('poster', vslCfg.thumbnailUrl.trim());
        }
        videoEl.setAttribute('controls', '');
        videoEl.setAttribute('autoplay', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.className = 'vsl-active-player';
        container.appendChild(videoEl);
        if (typeof videoEl.play === 'function') {
          Promise.resolve(videoEl.play()).catch(() => {});
        }
      } else {
        const separator = embedUrl.includes('?') ? '&' : '?';
        const autoPlayUrl = `${embedUrl}${separator}autoplay=1&rel=0&modestbranding=1`;
        const iframeEl = document.createElement('iframe');
        iframeEl.setAttribute('src', autoPlayUrl);
        iframeEl.setAttribute('title', videoTitle);
        iframeEl.setAttribute('frameborder', '0');
        iframeEl.setAttribute(
          'allow',
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        );
        iframeEl.setAttribute('allowfullscreen', '');
        iframeEl.className = 'vsl-active-player';
        container.appendChild(iframeEl);
      }

      container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      container.style.transition = 'transform 0.5s ease';
      container.classList.add('playing');
    }

    container.addEventListener('click', playVideo);

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

    [modalPrivacy, modalTerms].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(modalPrivacy);
        closeModal(modalTerms);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const config = window.CONFIG && typeof window.CONFIG === 'object' ? window.CONFIG : {};
    const profile = resolveValidatedProfile(config.businessLandingContent);
    applyTheme(config.theme, profile ? profile.theme : null);
    renderDynamicContent(config, profile);
  });
})();
