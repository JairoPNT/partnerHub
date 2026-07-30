/* app.js - Interactividad y renderizado dinámico para la Plantilla de Producto */

// Obtener la configuración cargada globalmente desde config.js
const getSiteConfig = () => {
  if (typeof window !== 'undefined' && window.CONFIG) {
    return window.CONFIG;
  }
  return {
    site: {
      id: 'ganomaster',
      title: 'GanoMaster — Bienestar y Vitalidad con Gano Excel',
      appName: 'ganomaster',
      ogTitle: 'GanoMaster — Bienestar y Vitalidad con Gano Excel',
      ogDescription: 'Transforma tus rituales diarios con el poder adaptógeno del Ganoderma Lucidum. Energía y claridad sin límites.',
      metaDescription: 'Descubre cómo transformar tu día a día con café, cacao y suplementos enriquecidos con Ganoderma lucidum. Bienestar, energía y equilibrio natural.'
    },
    distributor: {
      brandName: 'GanoMaster',
      firstName: 'Jairo',
      fullName: 'GanoMaster',
      role: 'Distribuidor Autorizado · Gano Excel',
      whatsappNumber: '573188430283',
      phoneNumber: '3188430283',
      displayPhone: '3188430283',
      purchaseUrl: '',
      defaultMessage: 'Hola Jairo, vengo de tu página web. Me gustaría tener más información sobre el Ganoderma de Gano Excel.'
    },
    hero: {
      desktop: 'https://media.partnerhub.club/clientes/ganomaster/producto/v1/hero-desktop.webp',
      mobile: 'https://media.partnerhub.club/clientes/ganomaster/producto/v1/hero-mobile.webp'
    },
    mediaBaseUrl: 'https://media.partnerhub.club/comunes/producto/v1/'
  };
};

document.addEventListener('DOMContentLoaded', () => {
  const cfg = getSiteConfig();
  initDynamicConfig(cfg);
  initPurchaseLinks();
  initMobileMenu();
  initFaqAccordion();
  initScrollAnimations();
  initWhatsAppLinks();
  initPhoneLinks();
  initStatCounter();
  initVideoCarousel();
  initModals();
  initCountryTargeting();
});

/**
 * Aplicar dinámicamente los datos de configuración en el DOM
 */
function initDynamicConfig(cfg) {
  if (!cfg) return;

  // 1. Configurar variables CSS para imágenes Hero
  if (cfg.hero) {
    if (cfg.hero.desktop) {
      document.documentElement.style.setProperty('--hero-desktop', `url('${cfg.hero.desktop}')`);
    }
    if (cfg.hero.mobile) {
      document.documentElement.style.setProperty('--hero-mobile', `url('${cfg.hero.mobile}')`);
    }
  }

  // 2. Actualizar SEO y Metas si están configurados
  if (cfg.site) {
    if (cfg.site.title) document.title = cfg.site.title;
    
    if (cfg.site.appName) {
      const metaApp = document.querySelector('meta[name="app-name"]');
      if (metaApp) metaApp.setAttribute('content', cfg.site.appName);
    }
    if (cfg.site.ogTitle) {
      const metaOgTitle = document.querySelector('meta[property="og:title"]');
      if (metaOgTitle) metaOgTitle.setAttribute('content', cfg.site.ogTitle);
    }
    if (cfg.site.ogDescription) {
      const metaOgDesc = document.querySelector('meta[property="og:description"]');
      if (metaOgDesc) metaOgDesc.setAttribute('content', cfg.site.ogDescription);
    }
    if (cfg.site.metaDescription) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', cfg.site.metaDescription);
    }

    const customFavicon = cfg.site.faviconUrl || cfg.faviconUrl;
    if (customFavicon) {
      const faviconEl = document.getElementById('faviconLink') || document.querySelector('link[rel="icon"]');
      if (faviconEl) {
        faviconEl.setAttribute('href', customFavicon);
        faviconEl.removeAttribute('type');
      }
    }
  }

  // 3. Renderizar textos marcados con data-config
  const dist = cfg.distributor || {};
  
  document.querySelectorAll('[data-config]').forEach(el => {
    const key = el.getAttribute('data-config');
    if (key === 'brandName') {
      if (el.childNodes.length > 0 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        el.childNodes[0].nodeValue = (dist.brandName || 'GanoMaster') + ' ';
      } else {
      el.textContent = dist.brandName || 'GanoMaster';
      }
    } else if (key === 'fullName') {
      el.textContent = dist.fullName || dist.brandName || 'GanoMaster';
    } else if (key === 'firstName') {
      el.textContent = dist.firstName || 'Jairo';
    } else if (key === 'role') {
      el.textContent = dist.role || 'Distribuidor Autorizado · Gano Excel';
    } else if (key === 'contactFirstNameBtn') {
      const firstName = dist.firstName || 'Jairo';
      if (el.childNodes.length > 0 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        el.childNodes[0].nodeValue = `Hablar con ${firstName}\n            `;
      } else {
        el.textContent = `Hablar con ${firstName}`;
      }
    } else if (key === 'displayPhone') {
      el.textContent = dist.displayPhone || dist.phoneNumber || '3188430283';
    } else if (key === 'purchaseUrlText') {
      el.textContent = dist.purchaseUrl || cfg.purchaseUrl || 'checkout configurado por el distribuidor';
    } else if (key === 'copyright') {
      const year = new Date().getFullYear();
      const name = dist.fullName || dist.brandName || 'GanoMaster';
      const role = dist.role || 'Distribuidor Autorizado Gano Excel';
      el.innerHTML = `&copy; ${year} ${name}. ${role}. Todos los derechos reservados.`;
    }
  });
}

/**
 * Control del menú de navegación móvil
 */
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');
  
  if (!menuToggle || !navMenu) return;
  
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('active');
    
    // Cambiar icono de menú a cerrar si está activo
    const isOpen = navMenu.classList.contains('active');
    menuToggle.innerHTML = isOpen 
      ? `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg class="icon" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
  });
  
  // Cerrar el menú al hacer clic en un enlace
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      menuToggle.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
    });
  });
  
  // Cerrar al hacer clic fuera del menú
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && e.target !== menuToggle) {
      navMenu.classList.remove('active');
      menuToggle.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
    }
  });
}

/**
 * Acordeón interactivo de Preguntas Frecuentes (FAQ)
 */
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const faqAnswer = faqItem.querySelector('.faq-answer');
      const isActive = faqItem.classList.contains('active');
      
      // Cerrar otros acordeones abiertos
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });
      
      // Abrir/cerrar el actual
      if (!isActive) {
        faqItem.classList.add('active');
        faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
      }
    });
  });
}

/**
 * Animaciones suaves al hacer scroll (Intersection Observer)
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.fade-in-scroll');
  
  if (!('IntersectionObserver' in window)) {
    animatedElements.forEach(el => el.classList.add('visible'));
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Dejar de observar tras animar
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  animatedElements.forEach(el => observer.observe(el));
}

/**
 * Personalización y generación dinámica de enlaces a WhatsApp
 */
function initWhatsAppLinks() {
  const cfg = getSiteConfig();
  const dist = cfg.distributor || {};
  const waNumber = dist.whatsappNumber || '573188430283';
  const firstName = dist.firstName || 'Jairo';
  const defaultMsg = dist.defaultMessage || `Hola ${firstName}, vengo de tu página web. Me gustaría tener más información sobre el Ganoderma de Gano Excel.`;
  
  const actionButtons = document.querySelectorAll('[data-wa-action]');
  
  actionButtons.forEach(btn => {
    const actionType = btn.getAttribute('data-wa-action');
    const itemName = btn.getAttribute('data-wa-item') || '';
    let message = defaultMsg;
    
    if (actionType === 'product') {
      message = `Hola ${firstName}, quiero este producto: *${itemName}*.`;
    } else if (actionType === 'kit') {
      message = `Hola ${firstName}, quiero descuento en el *${itemName}*. ¿Cómo puedo adquirirlo?`;
    } else if (actionType === 'contact') {
      message = `Hola ${firstName}, quiero hablar contigo para conocer más sobre el Ganoderma Lucidum y Gano Excel.`;
    } else if (actionType === 'negocio') {
      message = `Hola ${firstName}, estoy en tu página de negocio y me gustaría recibir más información sobre la oportunidad de Gano Excel y cómo unirme al Nexus Team.`;
    }
    
    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;
    
    btn.setAttribute('href', waUrl);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener noreferrer');
  });
}

/**
 * Personalización y asignación dinámica de enlaces de llamada telefónica
 */
function initPhoneLinks() {
  const cfg = getSiteConfig();
  const dist = cfg.distributor || {};
  const phone = dist.phoneNumber || '3188430283';
  const phoneButtons = document.querySelectorAll('[data-phone-action]');
  
  phoneButtons.forEach(btn => {
    btn.setAttribute('href', `tel:${phone}`);
  });
}

/**
 * Personalización dinámica de enlaces de compra directa
 */
function initPurchaseLinks() {
  const cfg = getSiteConfig();
  const dist = cfg.distributor || {};
  const purchaseUrl = dist.purchaseUrl || cfg.purchaseUrl || '';
  const purchaseButtons = document.querySelectorAll('.product-btn-buy');

  if (!purchaseUrl) {
    purchaseButtons.forEach(btn => {
      btn.removeAttribute('href');
      btn.removeAttribute('target');
      btn.removeAttribute('rel');
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('title', 'Checkout pendiente de configuracion');
    });
    return;
  }

  purchaseButtons.forEach(btn => {
    btn.setAttribute('href', purchaseUrl);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener noreferrer');
    btn.setAttribute('aria-disabled', 'false');
    btn.removeAttribute('title');
  });
}

/**
 * Animación incremental de números estadísticos
 */
function initStatCounter() {
  const statNumbers = document.querySelectorAll('[data-target-value]');
  
  const animateCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-target-value'));
    const isPercentage = el.getAttribute('data-is-percentage') === 'true';
    const isPlus = el.getAttribute('data-is-plus') === 'true';
    let current = 0;
    const duration = 1500; // 1.5s
    const stepTime = 15;
    const steps = duration / stepTime;
    const increment = target / steps;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        clearInterval(timer);
        el.textContent = formatVal(target, isPercentage, isPlus);
      } else {
        el.textContent = formatVal(Math.floor(current), isPercentage, isPlus);
      }
    }, stepTime);
  };
  
  const formatVal = (val, isPct, isPls) => {
    let formatted = val.toLocaleString('es-ES');
    if (isPct) formatted += '%';
    if (isPls) formatted += '+';
    return formatted;
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statNumbers.forEach(num => observer.observe(num));
}

/**
 * Inicialización del carrusel de videos nativos con URLs de CDN comunes
 */
function initVideoCarousel() {
  const cfg = getSiteConfig();
  const baseUrl = cfg.mediaBaseUrl || 'https://media.partnerhub.club/comunes/producto/v1/';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  const videos = [
    { file: `${cleanBaseUrl}videos/v01.mp4` },
    { file: `${cleanBaseUrl}videos/v02.mp4` },
    { file: `${cleanBaseUrl}videos/v03.mp4` },
    { file: `${cleanBaseUrl}videos/v04.mp4` },
    { file: `${cleanBaseUrl}videos/v05.mp4` },
    { file: `${cleanBaseUrl}videos/v06.mp4` },
    { file: `${cleanBaseUrl}videos/v07.mp4` },
    { file: `${cleanBaseUrl}videos/v08.mp4` },
    { file: `${cleanBaseUrl}videos/v09.mp4` },
    { file: `${cleanBaseUrl}videos/v10.mp4` }
  ];

  // Algoritmo Fisher-Yates para ordenar aleatoriamente
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const shuffled = shuffleArray([...videos]);
  // Duplicar el carrusel para el bucle infinito sin saltos
  const doubleList = [...shuffled, ...shuffled];

  const track = document.getElementById('vidTrack');
  const carouselSec = document.getElementById('vid-carousel');
  if (!track) return;

  track.innerHTML = doubleList.map((vid, index) => `
    <div class="vid-card" data-idx="${index}">
      <video autoplay muted loop playsinline src="${vid.file}"></video>
      <div class="vid-card-overlay"></div>
      <div class="vid-card-play">
        <button class="vid-play-btn" aria-label="Escuchar audio">
          <svg class="play-icon" width="18" height="20" viewBox="0 0 18 20" style="fill: var(--bg-dark); margin-left: 2px;"><path d="M0 0l18 10L0 20z"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  // 1. Variables de animación, arrastre (Drag & Scroll) y hover
  let currentX = 0;
  let isDragging = false;
  let isHovered = false;
  let isPlaying = false;
  let hasDragged = false;
  let startX = 0;
  let dragStartX = 0;
  let lastTime = performance.now();
  const pixelsPerSecond = 110; // Velocidad de desplazamiento lineal exacta

  // 2. Loop de animación lineal basado en Delta Time
  function updateScroll(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (!isDragging && !isHovered && !isPlaying) {
      currentX -= pixelsPerSecond * delta;
      const halfWidth = track.scrollWidth / 2;
      if (currentX <= -halfWidth) {
        currentX += halfWidth; // Bucle infinito sin saltos
      }
      track.style.transform = `translateX(${currentX}px)`;
    }
    requestAnimationFrame(updateScroll);
  }
  requestAnimationFrame(updateScroll);

  // Pausar desplazamiento al pasar el cursor (PC)
  if (carouselSec) {
    carouselSec.addEventListener('mouseenter', () => {
      isHovered = true;
    });
    carouselSec.addEventListener('mouseleave', () => {
      isHovered = false;
      lastTime = performance.now(); // Prevenir saltos temporales
    });
  }

  // 3. Controladores de arrastre (Drag & Swipe) para PC y Móviles
  const startDrag = (clientX) => {
    isDragging = true;
    hasDragged = false;
    startX = clientX;
    dragStartX = currentX;
    track.style.transition = 'none';
  };

  const moveDrag = (clientX) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    if (Math.abs(diff) > 5) {
      hasDragged = true;
    }
    currentX = dragStartX + diff;
    
    // Mantener bucle infinito durante el arrastre
    const halfWidth = track.scrollWidth / 2;
    if (currentX > 0) {
      currentX -= halfWidth;
    } else if (currentX <= -halfWidth) {
      currentX += halfWidth;
    }
    track.style.transform = `translateX(${currentX}px)`;
  };

  const endDrag = () => {
    if (isDragging) {
      isDragging = false;
      lastTime = performance.now();
    }
  };

  // Eventos de Mouse (PC)
  track.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag(e.clientX);
  });
  window.addEventListener('mousemove', (e) => {
    moveDrag(e.clientX);
  });
  window.addEventListener('mouseup', () => {
    endDrag();
  });

  // Eventos de Toque (Móviles)
  track.addEventListener('touchstart', (e) => {
    startDrag(e.touches[0].clientX);
  }, { passive: true });
  track.addEventListener('touchmove', (e) => {
    if (isDragging) {
      moveDrag(e.touches[0].clientX);
    }
  }, { passive: true });
  track.addEventListener('touchend', () => {
    endDrag();
  });

  // 4. Lógica de reproducción y silenciado
  const cards = track.querySelectorAll('.vid-card');
  cards.forEach(card => {
    const video = card.querySelector('video');
    const playBtn = card.querySelector('.vid-play-btn');

    // Desactivar audio de todos los demás videos del carrusel
    const muteAllOthers = () => {
      cards.forEach(c => {
        const v = c.querySelector('video');
        const btn = c.querySelector('.vid-play-btn');
        if (v && v !== video) {
          v.muted = true;
        }
        c.classList.remove('playing-audio');
        if (btn && btn.parentElement.parentElement !== card) {
          btn.innerHTML = `<svg class="play-icon" width="18" height="20" viewBox="0 0 18 20" style="fill: var(--bg-dark); margin-left: 2px;"><path d="M0 0l18 10L0 20z"/></svg>`;
        }
      });
    };

    // Restaurar silencio al quitar el cursor de la tarjeta
    card.addEventListener('mouseleave', () => {
      if (video && !video.muted) {
        video.muted = true;
        card.classList.remove('playing-audio');
        isPlaying = false;
        lastTime = performance.now();
        if (playBtn) {
          playBtn.innerHTML = `<svg class="play-icon" width="18" height="20" viewBox="0 0 18 20" style="fill: var(--bg-dark); margin-left: 2px;"><path d="M0 0l18 10L0 20z"/></svg>`;
        }
      }
    });

    // Permitir silenciar haciendo clic en la tarjeta
    card.addEventListener('click', () => {
      if (hasDragged) return;
      if (video && !video.muted) {
        video.muted = true;
        card.classList.remove('playing-audio');
        isPlaying = false;
        lastTime = performance.now();
        if (playBtn) {
          playBtn.innerHTML = `<svg class="play-icon" width="18" height="20" viewBox="0 0 18 20" style="fill: var(--bg-dark); margin-left: 2px;"><path d="M0 0l18 10L0 20z"/></svg>`;
        }
      }
    });

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasDragged) return;
        if (video) {
          if (video.muted) {
            muteAllOthers();
            video.muted = false;
            video.volume = 1.0;
            video.play().catch(err => console.warn("Error playing video:", err));
            card.classList.add('playing-audio');
            isPlaying = true;
            playBtn.innerHTML = `<svg class="mute-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
          } else {
            video.muted = true;
            card.classList.remove('playing-audio');
            isPlaying = false;
            lastTime = performance.now();
            playBtn.innerHTML = `<svg class="play-icon" width="18" height="20" viewBox="0 0 18 20" style="fill: var(--bg-dark); margin-left: 2px;"><path d="M0 0l18 10L0 20z"/></svg>`;
          }
        }
      });
    }
  });
}

/**
 * Inicialización de modales interactivos para Política de Privacidad y Términos de Servicio
 */
function initModals() {
  const linkPrivacy = document.getElementById('linkFooterPrivacy');
  const linkTerms = document.getElementById('linkFooterTerms');
  
  const modalPrivacy = document.getElementById('modalPrivacy');
  const modalTerms = document.getElementById('modalTerms');
  
  const btnClosePrivacy = document.getElementById('btnClosePrivacy');
  const btnCloseTerms = document.getElementById('btnCloseTerms');
  
  const openModal = (modal) => {
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };
  
  const closeModal = (modal) => {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
  
  // Eventos de apertura de políticas y términos
  if (linkPrivacy) {
    linkPrivacy.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(modalPrivacy);
    });
  }
  
  if (linkTerms) {
    linkTerms.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(modalTerms);
    });
  }
  
  // Eventos de cierre para todos los modales
  if (btnClosePrivacy) {
    btnClosePrivacy.addEventListener('click', () => closeModal(modalPrivacy));
  }
  
  if (btnCloseTerms) {
    btnCloseTerms.addEventListener('click', () => closeModal(modalTerms));
  }

  // Cerrar al hacer clic fuera del contenedor (para cualquier modal)
  [modalPrivacy, modalTerms].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });
  
  // Cerrar al presionar Escape (para cualquier modal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(modalPrivacy);
      closeModal(modalTerms);
    }
  });
}

/**
 * Detección dinámica de país para segmentación de contenido
 */
async function initCountryTargeting() {
  const detectCountry = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('ipapi.co error');
      const data = await response.json();
      return data.country_code;
    } catch (e) {
      console.warn("ipapi.co failed, trying freeipapi.com:", e);
      try {
        const responseFallback = await fetch('https://freeipapi.com/api/json');
        if (!responseFallback.ok) throw new Error('freeipapi error');
        const dataFallback = await responseFallback.json();
        return dataFallback.countryCode;
      } catch (e2) {
        console.warn("freeipapi.com failed, trying browser timezone check:", e2);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && tz.includes('Bogota')) {
          return 'CO';
        }
        return 'CO';
      }
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  let country = urlParams.get('country');
  
  if (!country) {
    country = await detectCountry();
  } else {
    country = country.toUpperCase();
    console.log(`País forzado vía URL: ${country}`);
  }

  console.log(`País final asignado: ${country}`);
  if (country && country !== 'CO') {
    document.body.classList.add('non-colombia');
    console.log("Navegación externa detectada. Ocultando botones de compra directa.");
  }
}
