(function () {
  function applyPreviewOverrides() {
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };

  const setAll = (selector, text) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = text;
    });
  };

  setAll('[data-bind="distributor.brandName"]', 'Sistema PartnerHub');
  setText('[data-bind="hero.badge"]', 'Presentacion completa de negocio');
  setText(
    '[data-bind="hero.headline"]',
    'Conoce un modelo de negocio digital con productos de consumo diario'
  );
  setText(
    '[data-bind="hero.subheadline"]',
    'Tienda virtual, logistica corporativa y acompanamiento para evaluar la oportunidad con informacion completa.'
  );
  setText('[data-bind="socialProof.headline"]', 'Sistema de crecimiento empresarial');
  setText('[data-bind="socialProof.subheadline"]', 'Productos + tienda virtual + soporte + comunidad');
  setText('[data-bind="vsl.durationText"]', 'Ver la informacion completa');
  setText('[data-bind="vsl.caption"]', 'Primero entiende el modelo. Luego decide si quieres una conversacion personalizada.');
  setAll('[data-bind="cta.headerBtnText"]', 'Hablar');
  setAll('[data-bind="cta.primaryText"]', 'Evaluar modelo');
  setAll('[data-bind="cta.secondaryText"]', 'Preguntar');
  setText('[data-bind="cta.guaranteeText"]', 'Cupos de acompanamiento sujetos a disponibilidad del equipo y zona. Sin promesas de ingresos.');

  const heroContent = document.querySelector('.hero-content');
  if (heroContent && !document.querySelector('.urgency-strip-preview')) {
    const strip = document.createElement('div');
    strip.className = 'urgency-strip-preview';
    strip.innerHTML = `
      <div><strong>Decision informada</strong><span>La presentacion filtra si el modelo encaja contigo antes de hablar con el equipo.</span></div>
      <div><strong>Ventana de entrada</strong><span>El acompanamiento se organiza por disponibilidad, pais y capacidad del mentor.</span></div>
      <div><strong>Accion simple</strong><span>Ver video, resolver dudas y decidir con claridad. Sin presion ni promesas faciles.</span></div>
    `;
    heroContent.appendChild(strip);
  }

  const vslWrapper = document.querySelector('.vsl-wrapper');
  const heroHeadline = document.querySelector('.hero-headline');
  const heroSubheadline = document.querySelector('.hero-subheadline');
  const heroSocialProof = document.querySelector('.hero-social-proof');
  if (vslWrapper && heroHeadline && vslWrapper.previousElementSibling !== heroHeadline) {
    heroHeadline.insertAdjacentElement('afterend', vslWrapper);
  }
  if (heroSubheadline && vslWrapper && heroSubheadline.previousElementSibling !== vslWrapper) {
    vslWrapper.insertAdjacentElement('afterend', heroSubheadline);
  }
  if (heroSocialProof && heroSubheadline && heroSocialProof.previousElementSibling !== heroSubheadline) {
    heroSubheadline.insertAdjacentElement('afterend', heroSocialProof);
  }

  if (vslWrapper && !document.querySelector('.decision-band-preview')) {
    const band = document.createElement('div');
    band.className = 'decision-band-preview';
    band.innerHTML = '<p><strong>Tu siguiente paso:</strong> mira la informacion completa y toma nota de tus preguntas. Una decision sana nace cuando entiendes el modelo antes de avanzar.</p><a href="#contacto" class="btn-secondary-vsl">Continuar</a>';
    vslWrapper.insertAdjacentElement('afterend', band);
  }

  const trustLabels = [
    'Logistica operativa',
    'Infraestructura internacional',
    'Productos de recompra',
    'Acompanamiento de equipo'
  ];
  document.querySelectorAll('.trust-item span').forEach((el, index) => {
    if (trustLabels[index]) el.textContent = trustLabels[index];
  });

  setText('[data-bind="comparison.badge"]', 'Primero el desafio');
  setText('[data-bind="comparison.title"]', 'La mayoria no falla por falta de ganas, falla por empezar sin sistema');
  setText(
    '[data-bind="comparison.subtitle"]',
    'Emprender suele exigir dinero, tiempo, inventario, publicidad, logistica y aprendizaje comercial. Esta presentacion explica una alternativa mas guiada: distribucion independiente apoyada en productos de consumo recurrente e infraestructura corporativa.'
  );
  setText('[data-bind="comparison.traditionalTitle"]', 'Cuando se emprende sin estructura');
  setText('[data-bind="comparison.opportunityTitle"]', 'Cuando existe un sistema de apoyo');

  const traditionalList = document.querySelector('.traditional-card ul, #traditional-list');
  if (traditionalList) {
    traditionalList.innerHTML = [
      'Inversion alta antes de validar si el mercado responde.',
      'Inventario, local, despacho y soporte quedan sobre una sola persona.',
      'Se improvisa el mensaje comercial y se pierde confianza al presentar.',
      'El crecimiento depende de tiempo disponible, ubicacion y contactos cercanos.'
    ].map((text) => `<li><span class="x-icon">x</span><span>${text}</span></li>`).join('');
  }

  const opportunityList = document.querySelector('.opportunity-card ul, #opportunity-list');
  if (opportunityList) {
    opportunityList.innerHTML = [
      'Punto de entrada accesible para conocer el modelo con producto real.',
      'Tienda virtual, bodega y logistica gestionadas por infraestructura existente.',
      'Marketing relacional, material de apoyo y acompanamiento del equipo.',
      'Posibilidad de expansion por paises segun reglas de la compania y actividad personal.'
    ].map((text) => `<li><span class="check-icon">+</span><span>${text}</span></li>`).join('');
  }

  const comparisonSection = document.getElementById('comparativa');
  if (comparisonSection && !document.querySelector('.waiting-cost-preview')) {
    const waitingSection = document.createElement('section');
    waitingSection.className = 'section waiting-cost-preview';
    waitingSection.id = 'claridad-antes-de-iniciar';
    waitingSection.innerHTML = `
      <div class="container">
        <div class="waiting-cost-copy">
          <span class="section-badge">Antes de iniciar</span>
          <h2>Entiende el modelo completo <span>y decide con criterio si esta oportunidad encaja contigo.</span></h2>
          <p>La presentacion resume productos, herramientas, acompanamiento, inversion inicial y expectativas reales antes de avanzar.</p>
          <a href="#hero-vsl" class="btn-primary-vsl">Volver a ver la presentacion</a>
        </div>
        <div class="waiting-cost-grid">
          <div class="waiting-cost-item"><strong>Producto y mercado</strong><span>Que lineas existen, por que el consumo recurrente importa y como se conversa sobre ellas.</span></div>
          <div class="waiting-cost-item"><strong>Tienda y operacion</strong><span>Como funciona la tienda virtual, la logistica corporativa y el proceso de entrega.</span></div>
          <div class="waiting-cost-item"><strong>Acompanamiento real</strong><span>Que apoyo recibe una persona al iniciar y como se organizan las primeras conversaciones.</span></div>
          <div class="waiting-cost-item"><strong>Expectativas correctas</strong><span>Que depende de tu actividad, que no esta garantizado y que preguntas debes resolver.</span></div>
        </div>
      </div>
    `;
    comparisonSection.insertAdjacentElement('afterend', waitingSection);
  }

  const benefitBadge = document.querySelector('#beneficios .section-badge');
  if (benefitBadge) benefitBadge.textContent = 'El mecanismo';
  const benefitTitle = document.querySelector('#beneficios .section-header h2');
  if (benefitTitle) benefitTitle.textContent = 'Por que este modelo puede ser mas facil de evaluar';
  const benefitIntro = document.querySelector('#beneficios .section-header p');
  if (benefitIntro) {
    benefitIntro.textContent = 'La oportunidad se entiende mejor cuando separas sus componentes: mercado, producto, infraestructura, soporte y proceso de decision.';
  }

  [
    ['Mercados con demanda existente', 'Cafe, bienestar, bebidas funcionales y cuidado personal son categorias conocidas; la conversacion no parte de vender algo abstracto.'],
    ['Producto fisico y recompra', 'El modelo se apoya en consumo real de productos, no en intercambio de dinero por dinero ni promesas especulativas.'],
    ['Infraestructura que reduce friccion', 'Tienda virtual, bodega, facturacion y despacho ayudan a que el partner se enfoque en aprender, compartir y acompanar.'],
    ['Sistema para no avanzar solo', 'Guias, material promocional, entrenamiento, estructura de pauta y mentoria ayudan a convertir interes en accion ordenada.']
  ].forEach(([title, description], index) => {
    const card = document.querySelectorAll('.benefit-card')[index];
    if (!card) return;
    const h3 = card.querySelector('h3');
    const p = card.querySelector('p');
    if (h3) h3.textContent = title;
    if (p) p.textContent = description;
  });

  setText('[data-bind="methodology.badge"]', 'Secuencia de decision');
  setText('[data-bind="methodology.title"]', 'Del interes a una conversacion seria');
  setText(
    '[data-bind="methodology.subtitle"]',
    'La pagina debe llevar a la persona por una ruta clara: entender el problema, ver el mecanismo, resolver objeciones y decidir el siguiente paso.'
  );

  [
    ['01', 'Mira la informacion completa', 'La presentacion explica inversion, productos, tienda virtual, logistica, expansion, soporte y forma de trabajo.'],
    ['02', 'Valida tus objeciones', 'Revisa si te hace sentido el tiempo, el acompanamiento, el tipo de producto y la forma de compartirlo.'],
    ['03', 'Agenda orientacion', 'Si el modelo encaja, conversa por WhatsApp para recibir una guia de inicio segun tu pais, perfil y disponibilidad.']
  ].forEach(([number, title, description], index) => {
    const step = document.querySelectorAll('.method-step')[index];
    if (!step) return;
    const numberEl = step.querySelector('.step-number');
    const h3 = step.querySelector('h3');
    const p = step.querySelector('p');
    if (numberEl) numberEl.textContent = number;
    if (h3) h3.textContent = title;
    if (p) p.textContent = description;
  });

  setText('[data-bind="testimonials.badge"]', 'Prueba visual');
  setText('[data-bind="testimonials.title"]', 'Historias reales para ver el modelo desde adentro');
  setText(
    '[data-bind="testimonials.subtitle"]',
    'Escucha experiencias, aprendizajes y puntos de vista de personas que han conocido el sistema, los productos y la forma de trabajo del equipo.'
  );

  function renderBusinessVideoCarousel() {
    const testimonialsGrid = document.getElementById('testimonials-grid') || document.querySelector('#testimonios .testimonials-grid');
    if (!testimonialsGrid || testimonialsGrid.dataset.previewCarousel === 'true') return;
    const baseUrl = (window.CONFIG && window.CONFIG.mediaBaseUrl) || 'https://media.partnerhub.club/comunes/producto/v1/';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const videos = Array.from({ length: 10 }, (_, index) => `${cleanBaseUrl}videos/v${String(index + 1).padStart(2, '0')}.mp4`);
    const doubleVideos = [...videos, ...videos];
    testimonialsGrid.dataset.previewCarousel = 'true';
    testimonialsGrid.className = 'business-video-carousel';
    testimonialsGrid.innerHTML = `
      <div class="business-video-track">
        ${doubleVideos.map((src, index) => `
          <div class="business-video-card" data-video-index="${index + 1}">
            <video autoplay muted loop playsinline src="${src}"></video>
            <div class="business-video-play" aria-hidden="true"><span>▶</span></div>
          </div>
        `).join('')}
      </div>
    `;

    testimonialsGrid.querySelectorAll('video').forEach((video) => {
      video.play().catch(() => {});
    });
  }

  renderBusinessVideoCarousel();
  [250, 800, 1600].forEach((delay) => window.setTimeout(renderBusinessVideoCarousel, delay));

  const testimonialsSection = document.getElementById('testimonios');
  if (testimonialsSection && !testimonialsSection.dataset.previewObserver) {
    testimonialsSection.dataset.previewObserver = 'true';
    const observer = new MutationObserver(() => {
      window.setTimeout(renderBusinessVideoCarousel, 60);
    });
    observer.observe(testimonialsSection, { childList: true, subtree: true });
  }

  setText('[data-bind="faq.badge"]', 'Objeciones clave');
  setText('[data-bind="faq.title"]', 'Antes de escribir, resuelve estas preguntas');
  setText(
    '[data-bind="faq.subtitle"]',
    'Las mejores paginas de decision reducen dudas antes del contacto. Esta seccion prepara una conversacion mas calificada por WhatsApp.'
  );

  const faq = document.getElementById('faq-container');
  if (faq) {
    faq.innerHTML = [
      ['Esto garantiza dinero?', 'No. Es una oportunidad de distribucion independiente. Cualquier resultado depende de actividad, constancia, habilidades comerciales, tiempo dedicado, mercado y cumplimiento del sistema.'],
      ['Por que hablar de inversion accesible?', 'Porque permite evaluar el modelo con un punto de entrada claro. La inversion no debe presentarse como garantia de retorno, sino como acceso a productos, herramientas y sistema.'],
      ['Tengo que manejar inventario o entregas?', 'La presentacion explica la tienda virtual, bodega central y logistica corporativa. Las condiciones pueden variar por pais y deben aclararse antes de iniciar.'],
      ['Que genera urgencia real?', 'La urgencia correcta no es prometer ganancias rapidas. Es la disponibilidad de acompanamiento, la ventana de decision y el costo de seguir postergando una alternativa comercial seria.'],
      ['Cual es la decision esperada?', 'No es comprar por impulso. Es ver la presentacion, entender el modelo y pedir orientacion si realmente quieres evaluarlo con mas detalle.']
    ].map(([question, answer]) => `
      <div class="faq-item">
        <button class="faq-question" aria-expanded="false"><span>${question}</span><span class="faq-icon">+</span></button>
        <div class="faq-answer"><p>${answer}</p></div>
      </div>
    `).join('');
  }

  const finalBadge = document.querySelector('.final-cta-badge');
  if (finalBadge) finalBadge.textContent = 'Decision con claridad';
  const finalTitle = document.querySelector('.final-cta-title');
  if (finalTitle) finalTitle.textContent = 'Quieres revisar si este modelo tiene sentido para ti?';
  const finalDesc = document.querySelector('.final-cta-desc');
  if (finalDesc) {
    finalDesc.textContent = 'Si ya viste la presentacion y quieres entender como seria el inicio en tu caso, escribe por WhatsApp. La conversacion es para orientar, resolver dudas y revisar encaje; no para prometer resultados.';
  }
  setAll('[data-bind="cta.primaryText"]', 'Evaluar modelo');
  setAll('[data-bind="cta.secondaryText"]', 'Preguntar');

  const disclaimer = document.querySelector('[data-bind="legal.disclaimer"]');
  if (disclaimer) {
    disclaimer.innerHTML = '<strong>Descargo de responsabilidad:</strong> Esta es una oportunidad de distribucion independiente basada en comercializacion y consumo de productos. No existen ingresos garantizados, automaticos ni universales. Los resultados dependen del esfuerzo personal, habilidades comerciales, constancia, tiempo dedicado, mercado, cumplimiento del sistema y condiciones de la compania. La informacion de esta pagina es educativa y comercial.';
  }

  const decisionMomentum = {
    enabled: true,
    intervalMinMs: 12000,
    intervalMaxMs: 28000,
    visibleMs: 5200,
    occasionalPauseChance: 0.22,
    occasionalPauseMinMs: 45000,
    occasionalPauseMaxMs: 90000,
    items: [
      {
        label: 'Interes reciente',
        text: 'Una persona paso de ver la presentacion a solicitar orientacion inicial.'
      },
      {
        label: 'Paso de decision',
        text: 'Alguien esta revisando la ruta de inicio antes de registrarse.'
      },
      {
        label: 'Movimiento del sistema',
        text: 'Nuevo interesado evaluando tienda virtual, productos y acompanamiento.'
      },
      {
        label: 'Avance de proceso',
        text: 'Una persona esta resolviendo objeciones antes de tomar una decision.'
      },
      {
        label: 'Orientacion solicitada',
        text: 'Un interesado pidio claridad sobre inversion, productos y forma de trabajo.'
      },
      {
        label: 'Decision informada',
        text: 'Alguien volvio a la presentacion para revisar si el modelo encaja con su perfil.'
      },
      {
        label: 'Validacion de producto',
        text: 'Un interesado esta revisando las lineas de producto antes de avanzar.'
      },
      {
        label: 'Tienda virtual',
        text: 'Una persona esta entendiendo como funciona la tienda y la logistica.'
      },
      {
        label: 'Acompanamiento',
        text: 'Alguien esta revisando que apoyo recibe durante sus primeros pasos.'
      },
      {
        label: 'Expectativas claras',
        text: 'Un visitante esta leyendo que depende de su actividad y que no esta garantizado.'
      }
    ]
  };

  const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function createMomentumToast() {
    const toast = document.createElement('aside');
    toast.className = 'momentum-toast';
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="momentum-toast-label"><span class="momentum-toast-dot"></span><span data-role="label"></span></div>
      <div class="momentum-toast-text" data-role="text"></div>
      <div class="momentum-toast-footnote">Senales informativas del proceso. No representan ingresos ni resultados garantizados.</div>
    `;
    document.body.appendChild(toast);
    return toast;
  }

  function startDecisionMomentum() {
    if (!decisionMomentum.enabled || document.querySelector('.momentum-toast')) return;
    const toast = createMomentumToast();
    let lastIndex = -1;

    const getNextItem = () => {
      if (decisionMomentum.items.length === 1) return decisionMomentum.items[0];
      let nextIndex = randomBetween(0, decisionMomentum.items.length - 1);
      if (nextIndex === lastIndex) {
        nextIndex = (nextIndex + 1) % decisionMomentum.items.length;
      }
      lastIndex = nextIndex;
      return decisionMomentum.items[nextIndex];
    };

    const getNextDelay = () => {
      if (Math.random() < decisionMomentum.occasionalPauseChance) {
        return randomBetween(decisionMomentum.occasionalPauseMinMs, decisionMomentum.occasionalPauseMaxMs);
      }
      return randomBetween(decisionMomentum.intervalMinMs, decisionMomentum.intervalMaxMs);
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
      }, decisionMomentum.visibleMs);
    };

    window.setTimeout(showNext, randomBetween(2500, 5000));
  }

    startDecisionMomentum();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPreviewOverrides, { once: true });
  } else {
    applyPreviewOverrides();
  }

  window.setTimeout(applyPreviewOverrides, 150);
}());
