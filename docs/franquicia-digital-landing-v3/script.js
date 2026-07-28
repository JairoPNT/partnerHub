const CONFIG = {
  whatsappNumber: "573188430283",
  whatsappMessage:
    "Hola, quiero conocer la ruta correcta de Franquicia Digital para mi negocio."
};

const whatsappCta = document.getElementById("whatsappCta");
const whatsappHint = document.getElementById("whatsappHint");
const pricingTabs = document.querySelectorAll(".pricing-tab");
const pricingPanels = document.querySelectorAll(".pricing-panel");
const revealItems = document.querySelectorAll(".reveal");

const hasValidWhatsapp = /^57\d{10}$/.test(CONFIG.whatsappNumber);

if (whatsappCta) {
  if (hasValidWhatsapp) {
    const message = encodeURIComponent(CONFIG.whatsappMessage);
    whatsappCta.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${message}`;

    if (whatsappHint) {
      whatsappHint.textContent =
        "Este CTA abre directamente el WhatsApp comercial configurado para Jairo Pinto.";
    }
  } else {
    whatsappCta.href = "javascript:void(0)";
    whatsappCta.setAttribute("aria-disabled", "true");
    whatsappCta.style.opacity = "0.72";
    whatsappCta.style.cursor = "not-allowed";
  }
}

pricingTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    pricingTabs.forEach((button) => {
      button.classList.toggle("is-active", button === tab);
    });

    pricingPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === target);
    });
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14
  }
);

revealItems.forEach((item) => revealObserver.observe(item));
