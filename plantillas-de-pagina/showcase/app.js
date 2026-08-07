/**
 * app.js - Showcase Central Hub Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const config = window.CONFIG;
  if (!config) {
    console.error("Configuración de GanoMaster Showcase no encontrada.");
    return;
  }

  // 1. Iconos Vectoriales
  const getIconSvg = (iconName) => {
    switch (iconName) {
      case "shopping-bag":
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
      case "video":
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>`;
      case "user-check":
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`;
      default:
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    }
  };

  const checkIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const externalLinkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

  // 2. Renderizar Ecosistemas
  const container = document.getElementById("ecosystems-container");
  if (container && config.ecosystems) {
    container.innerHTML = config.ecosystems.map((eco) => {
      const featuresHtml = eco.features.map(f => `
        <li>
          <span class="feature-check">${checkIconSvg}</span>
          <span>${f}</span>
        </li>
      `).join("");

      return `
        <article class="ecosystem-card" style="--card-accent: ${eco.accentColor};">
          <div>
            <div class="card-top">
              <div class="card-icon">
                ${getIconSvg(eco.icon)}
              </div>
              <span class="card-badge">${eco.badge}</span>
            </div>

            <div class="card-tagline">${eco.tagline}</div>
            <h3 class="card-title">${eco.name}</h3>
            <p class="card-desc">${eco.description}</p>

            <ul class="card-features">
              ${featuresHtml}
            </ul>
          </div>

          <div class="card-bottom">
            <div class="subdomain-display">
              <span>Subdominio:</span>
              <strong>${eco.subdomain}</strong>
            </div>

            <a href="${eco.url}" target="_blank" rel="noopener noreferrer" class="cta-button">
              <span>Abrir ${eco.name}</span>
              ${externalLinkSvg}
            </a>
          </div>
        </article>
      `;
    }).join("");
  }

  // 3. Renderizar Expansiones Futuras
  const expansionContainer = document.getElementById("expansion-container");
  if (expansionContainer && config.futureExpansions) {
    expansionContainer.innerHTML = config.futureExpansions.map(exp => `
      <div class="expansion-card">
        <div class="expansion-card-title">
          <span>${exp.name}</span>
          <span class="badge-upcoming">${exp.status}</span>
        </div>
        <div class="expansion-card-subdomain">${exp.subdomain}</div>
        <p class="expansion-card-desc">${exp.description}</p>
      </div>
    `).join("");
  }

  // 4. Controlador de Temas PH-025
  const fontSelect = document.getElementById("select-font");
  const paletteSelect = document.getElementById("select-palette");
  const htmlRoot = document.documentElement;

  if (fontSelect) {
    fontSelect.value = config.theme?.fontPreset || "font-modern";
    fontSelect.addEventListener("change", (e) => {
      htmlRoot.setAttribute("data-font", e.target.value);
    });
  }

  if (paletteSelect) {
    paletteSelect.value = config.theme?.palettePreset || "palette-ocean";
    paletteSelect.addEventListener("change", (e) => {
      htmlRoot.setAttribute("data-palette", e.target.value);
    });
  }
});
