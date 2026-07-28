/* app.js - Interactividad para el sitio de Claudia Calero */

// Configuración global de contacto
const CONFIG = {
  whatsappNumber: '573170866761', // Nuevo número de Claudia Calero
  phoneNumber: '3170866761',     // Nuevo número de teléfono para llamadas directas
  defaultMessage: 'Hola Claudia, vengo de tu página web. Me gustaría tener más información sobre el Ganoderma de Gano Excel.'
};

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaqAccordion();
  initScrollAnimations();
  initWhatsAppLinks();
  initPhoneLinks();
  initStatCounter();
  initModals();
  initCountryTargeting();
});

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
  const actionButtons = document.querySelectorAll('[data-wa-action]');
  
  actionButtons.forEach(btn => {
    const actionType = btn.getAttribute('data-wa-action');
    const itemName = btn.getAttribute('data-wa-item') || '';
    let message = CONFIG.defaultMessage;
    
    if (actionType === 'product') {
      message = `Hola Claudia, estoy en tu sitio web y me gustaría recibir asesoría sobre el producto: *${itemName}*.`;
    } else if (actionType === 'kit') {
      message = `Hola Claudia, me interesa el kit funcional: *${itemName}*. ¿Cómo puedo adquirirlo contigo?`;
    } else if (actionType === 'contact') {
      message = `Hola Claudia, quiero hablar contigo para conocer más sobre el Ganoderma Lucidum y Gano Excel.`;
    } else if (actionType === 'negocio') {
      message = `Hola Claudia, estoy en tu página de negocio y me gustaría recibir más información sobre la oportunidad de Gano Excel y cómo unirme al Nexus Team.`;
    }
    
    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
    
    btn.setAttribute('href', waUrl);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener noreferrer');
  });
}

/**
 * Personalización y asignación dinámica de enlaces de llamada telefónica
 */
function initPhoneLinks() {
  const phoneButtons = document.querySelectorAll('[data-phone-action]');
  
  phoneButtons.forEach(btn => {
    btn.setAttribute('href', `tel:${CONFIG.phoneNumber}`);
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
 * Inicialización de modales interactivos para Política de Privacidad y Términos de Servicio
 */
function initModals() {
  const linkPrivacy = document.getElementById('linkFooterPrivacy');
  const linkTerms = document.getElementById('linkFooterTerms');
  
  const modalPrivacy = document.getElementById('modalPrivacy');
  const modalTerms = document.getElementById('modalTerms');
  
  const btnClosePrivacy = document.getElementById('btnClosePrivacy');
  const btnCloseTerms = document.getElementById('btnCloseTerms');
  
  if (!modalPrivacy || !modalTerms) return;
  
  const openModal = (modal) => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  
  const closeModal = (modal) => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };
  
  // Eventos de apertura
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
  
  // Eventos de cierre
  if (btnClosePrivacy) {
    btnClosePrivacy.addEventListener('click', () => closeModal(modalPrivacy));
  }
  
  if (btnCloseTerms) {
    btnCloseTerms.addEventListener('click', () => closeModal(modalTerms));
  }
  
  // Cerrar al hacer clic fuera del contenedor
  [modalPrivacy, modalTerms].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
  
  // Cerrar al presionar Escape
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
      return data.country_code; // e.g. "CO", "US"
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
        return 'CO'; // Default to CO
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

