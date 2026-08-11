/**
 * PartnerHub / Franquicia Digital - Campaña Beta Ecosistema de Producto (PH-004B)
 * Lógica JS Standalone para Hosting Tradicional
 */

document.addEventListener("DOMContentLoaded", () => {
  // Configuración de constantes de pago
  const PAYMENT_CONFIG = {
    amount: "$247.000 COP",
    bancolombia: "75024566161",
    breB1: "94536693",
    breB2: "3188430283",
    breB3: "@XML693",
    wompiUrl: "https://checkout.wompi.co/l/y3r4Vi",
  };

  // Elementos DOM
  const modal = document.getElementById("payment-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const closeModalFooterBtn = document.getElementById("close-modal-footer-btn");
  const form = document.getElementById("activation-form");
  const modalUserName = document.getElementById("modal-user-name");

  // Tabs en modal
  const tabWompi = document.getElementById("tab-wompi");
  const tabDirect = document.getElementById("tab-direct");
  const contentWompi = document.getElementById("content-wompi");
  const contentDirect = document.getElementById("content-direct");

  // Función abrir modal
  function openModal(userName = "", defaultTab = "wompi") {
    if (modalUserName) {
      modalUserName.textContent = userName ? `Hola ${userName}, ` : "";
    }
    switchTab(defaultTab);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    }
  }

  // Función cerrar modal
  function closeModal() {
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    }
  }

  // Switch de pestañas en modal
  function switchTab(tab) {
    if (tab === "wompi") {
      tabWompi?.classList.add("bg-white", "text-cyan-950", "shadow-sm", "ring-1", "ring-slate-200");
      tabWompi?.classList.remove("text-slate-600");
      tabDirect?.classList.remove("bg-white", "text-cyan-950", "shadow-sm", "ring-1", "ring-slate-200");
      tabDirect?.classList.add("text-slate-600");

      contentWompi?.classList.remove("hidden");
      contentDirect?.classList.add("hidden");
    } else {
      tabDirect?.classList.add("bg-white", "text-cyan-950", "shadow-sm", "ring-1", "ring-slate-200");
      tabDirect?.classList.remove("text-slate-600");
      tabWompi?.classList.remove("bg-white", "text-cyan-950", "shadow-sm", "ring-1", "ring-slate-200");
      tabWompi?.classList.add("text-slate-600");

      contentDirect?.classList.remove("hidden");
      contentWompi?.classList.add("hidden");
    }
  }

  // Event Listeners Tabs
  tabWompi?.addEventListener("click", () => switchTab("wompi"));
  tabDirect?.addEventListener("click", () => switchTab("direct"));

  // Event Listeners Modal Close
  closeModalBtn?.addEventListener("click", closeModal);
  closeModalFooterBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // Copiar al portapapeles con feedback visual
  window.copyText = function (text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHTML = buttonElement.innerHTML;
      buttonElement.innerHTML = `
        <svg class="w-4 h-4 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>Copiado</span>
      `;
      buttonElement.classList.add("border-emerald-500", "text-emerald-700");

      setTimeout(() => {
        buttonElement.innerHTML = originalHTML;
        buttonElement.classList.remove("border-emerald-500", "text-emerald-700");
      }, 2200);
    });
  };

  // Formulario Submit
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullName = document.getElementById("input-fullname")?.value.trim();
      const whatsapp = document.getElementById("input-whatsapp")?.value.trim();
      const email = document.getElementById("input-email")?.value.trim();
      const brandName = document.getElementById("input-brand")?.value.trim();
      const mainProduct = document.getElementById("input-product")?.value.trim();
      const termsAccepted = document.getElementById("input-terms")?.checked;
      const paymentMethodRadio = document.querySelector('input[name="payment_method"]:checked')?.value || "wompi";

      // Validaciones
      let isValid = true;

      function showError(id, msg) {
        const errEl = document.getElementById(`err-${id}`);
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove("hidden");
        }
        isValid = false;
      }

      function clearError(id) {
        const errEl = document.getElementById(`err-${id}`);
        if (errEl) {
          errEl.textContent = "";
          errEl.classList.add("hidden");
        }
      }

      clearError("fullname");
      clearError("whatsapp");
      clearError("email");
      clearError("brand");
      clearError("product");
      clearError("terms");

      if (!fullName) showError("fullname", "Ingresa tu nombre completo");
      if (!whatsapp) showError("whatsapp", "Ingresa tu número de WhatsApp");
      if (!email || !email.includes("@")) showError("email", "Ingresa un correo electrónico válido");
      if (!brandName) showError("brand", "Ingresa el nombre de tu marca o negocio");
      if (!mainProduct) showError("product", "Indica el producto principal a presentar");
      if (!termsAccepted) showError("terms", "Debes aceptar las condiciones de la oferta beta");

      if (isValid) {
        // Redirigir a la página de gracias con confirmación
        window.location.href = "gracias.html";
      }
    });
  }

  // FAQ Accordion
  const faqButtons = document.querySelectorAll(".faq-btn");
  faqButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector(".faq-icon");

      const isHidden = content.classList.contains("hidden");

      // Cerrar otros
      document.querySelectorAll(".faq-content").forEach((c) => c.classList.add("hidden"));
      document.querySelectorAll(".faq-icon").forEach((i) => i.classList.remove("rotate-180", "text-cyan-600"));

      if (isHidden) {
        content.classList.remove("hidden");
        icon?.classList.add("rotate-180", "text-cyan-600");
      }
    });
  });

  // Exponer función global para abrir modal desde botones CTA de pago
  window.openPaymentModal = function (method = "wompi") {
    openModal("", method);
  };
});
