import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "../../..");
const TEMPLATE_DIR = resolve(ROOT, "plantillas-de-pagina/business");

const normalizeCopy = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

const DISALLOWED_TEMPLATE_PATTERNS = [
  /libertad financiera/,
  /ingresos residuales/,
  /ganas cada vez que alguien toma cafe/,
  /resultados desde las primeras semanas/,
  /cero inventarios/,
  /logistica 100% cubierta/,
  /(?:formacion|capacitacion)[^.!?\n]*sin costo/,
  /presencia internacional/,
  /70 paises/,
  /10 paises/,
  /multinacional/,
  /compania internacional/,
  /registros? sanitarios?/,
  /\binvima\b/,
  /\bfda\b/,
  /respaldo financiero/,
  /solidez financiera/,
  /ley 1700/,
  /cupos limitados/,
  /asegura tu posicion/,
  /8 a 12 horas/,
  /presentacion oficial/,
  /quiero participar y registrarme/,
  /claudia calero/,
  /573177894541/,
  /claudiacalero\.pro/
];

async function readTemplateFiles() {
  const [configJs, appJs, indexHtml, stylesCss] = await Promise.all([
    readFile(resolve(TEMPLATE_DIR, "config.js"), "utf8"),
    readFile(resolve(TEMPLATE_DIR, "app.js"), "utf8"),
    readFile(resolve(TEMPLATE_DIR, "index.html"), "utf8"),
    readFile(resolve(TEMPLATE_DIR, "styles.css"), "utf8")
  ]);
  return { configJs, appJs, indexHtml, stylesCss };
}

function loadMasterConfig(configJs) {
  return JSON.parse(
    runInNewContext(`${configJs}\nJSON.stringify(CONFIG)`, Object.create(null), {
      timeout: 500
    })
  );
}

/**
 * Lightweight DOM harness to test plantillas-de-pagina/business/app.js + index.html
 * without external browser dependencies, verifying textContent, attributes, classes,
 * styles, event listeners, and ensuring no executable script injection occurs.
 */
function createDomEnvironment(indexHtml, configOverride) {
  const elementsById = new Map();
  const allElements = [];
  const docListeners = new Map();

  class FakeElement {
    constructor(tagName, attrs = {}) {
      this.tagName = String(tagName).toUpperCase();
      this.attributes = new Map();
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.hidden = false;
      this._textContent = "";
      this._innerHTML = "";
      this.src = "";
      const styleProps = new Map();
      this.style = {
        display: "",
        visibility: "",
        overflow: "",
        transform: "",
        transition: "",
        setProperty: (k, v) => styleProps.set(k, String(v)),
        getPropertyValue: (k) => styleProps.get(k) || ""
      };
      const classes = new Set();
      this.classList = {
        add: (...tokens) => tokens.forEach((t) => t && classes.add(t)),
        remove: (...tokens) => tokens.forEach((t) => classes.delete(t)),
        contains: (t) => classes.has(t),
        toggle: (t) => (classes.has(t) ? (classes.delete(t), false) : (classes.add(t), true)),
        toString: () => [...classes].join(" ")
      };

      for (const [k, v] of Object.entries(attrs)) {
        this.setAttribute(k, v);
      }
      allElements.push(this);
    }

    set id(val) {
      this.setAttribute("id", val);
    }
    get id() {
      return this.getAttribute("id") || "";
    }

    set className(val) {
      this.setAttribute("class", val);
    }
    get className() {
      return this.classList.toString();
    }

    set textContent(val) {
      this._textContent = String(val ?? "");
      this._innerHTML = "";
      this.children = [];
    }
    get textContent() {
      if (this.children.length > 0) {
        return this._textContent + this.children.map((c) => c.textContent).join(" ");
      }
      return this._textContent;
    }

    set innerHTML(val) {
      this._innerHTML = String(val ?? "");
      this._textContent = this._innerHTML.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      this.children = [];
    }
    get innerHTML() {
      return this._innerHTML;
    }

    setAttribute(name, value) {
      const strVal = String(value ?? "");
      this.attributes.set(name, strVal);
      if (name === "id" && strVal) {
        elementsById.set(strVal, this);
      }
      if (name === "class") {
        strVal
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => this.classList.add(c));
      }
      if (name === "hidden") {
        this.hidden = true;
      }
      if (name === "src") {
        this.src = strVal;
      }
    }

    getAttribute(name) {
      return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === "hidden") this.hidden = false;
    }

    appendChild(child) {
      if (child && typeof child === "object") {
        child.parentNode = this;
        this.children.push(child);
      }
      return child;
    }

    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }

    matches(selector) {
      const s = selector.trim();
      if (s.startsWith("#")) return this.id === s.slice(1);
      if (s.startsWith(".")) return this.classList.contains(s.slice(1));
      const dataBindMatch = s.match(/^\[data-bind="([^"]+)"\]$/);
      if (dataBindMatch) return this.getAttribute("data-bind") === dataBindMatch[1];
      const dataConfigMatch = s.match(/^\[data-config="([^"]+)"\]$/);
      if (dataConfigMatch) return this.getAttribute("data-config") === dataConfigMatch[1];
      const metaNameMatch = s.match(/^meta\[name="([^"]+)"\]$/);
      if (metaNameMatch) return this.tagName === "META" && this.getAttribute("name") === metaNameMatch[1];
      const metaPropMatch = s.match(/^meta\[property="([^"]+)"\]$/);
      if (metaPropMatch) return this.tagName === "META" && this.getAttribute("property") === metaPropMatch[1];
      const navHrefMatch = s.match(/^a\.header-link\[href="([^"]+)"\]$/);
      if (navHrefMatch) {
        return (
          this.tagName === "A" &&
          this.classList.contains("header-link") &&
          this.getAttribute("href") === navHrefMatch[1]
        );
      }
      return this.tagName === s.toUpperCase();
    }

    querySelectorAll(selector) {
      const parts = selector.split(",").map((p) => p.trim());
      const results = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (parts.some((p) => child.matches(p))) results.push(child);
          visit(child);
        }
      };
      visit(this);
      return results;
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    closest(selector) {
      let curr = this;
      while (curr) {
        if (curr.matches && curr.matches(selector)) return curr;
        curr = curr.parentNode;
      }
      return null;
    }
  }

  // Parse static elements from index.html so selectors in app.js resolve accurately
  const rootElement = new FakeElement("html");
  const bodyElement = new FakeElement("body");
  rootElement.appendChild(bodyElement);

  const tagRegex = /<([a-zA-Z0-9]+)\s+([^>]*?)>/g;
  let match;
  while ((match = tagRegex.exec(indexHtml)) !== null) {
    const tag = match[1];
    const attrString = match[2];
    const attrs = {};
    const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
    let aMatch;
    while ((aMatch = attrRegex.exec(attrString)) !== null) {
      attrs[aMatch[1]] = aMatch[2] ?? "";
    }
    if (attrs.id || attrs["data-bind"] || attrs["data-config"] || attrs.class || tag === "meta") {
      const el = new FakeElement(tag, attrs);
      bodyElement.appendChild(el);
    }
  }

  const noticeBoxEl = elementsById.get("heroModelNotice");
  for (const childId of ["modelNoticeTitle", "modelNoticeList", "heroDedicationText"]) {
    const childEl = elementsById.get(childId);
    if (noticeBoxEl && childEl) {
      noticeBoxEl.appendChild(childEl);
    }
  }

  const document = {
    title: "",
    documentElement: rootElement,
    body: bodyElement,
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
    getElementById: (id) => elementsById.get(id) || null,
    querySelectorAll: (selector) => {
      const parts = selector.split(",").map((p) => p.trim());
      return allElements.filter((el) => parts.some((p) => el.matches(p)));
    },
    querySelector: (selector) => document.querySelectorAll(selector)[0] || null,
    addEventListener: (type, fn) => {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    }
  };

  const window = {
    CONFIG: configOverride,
    document,
    location: { search: "", hostname: "negocio.claudiacalero.pro" }
  };
  window.window = window;
  window.globalThis = window;

  return {
    window,
    document,
    elementsById,
    allElements,
    triggerDOMContentLoaded: () => {
      for (const fn of docListeners.get("DOMContentLoaded") || []) {
        fn();
      }
    }
  };
}

test("canonical Business template files contain no disallowed claims, urgency, or hardcoded Claudia identity", async () => {
  const { configJs, appJs, indexHtml } = await readTemplateFiles();
  const stripComments = (code) =>
    code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(?:^|\s)\/\/.*$/gm, " ");
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, " ");

  const sources = [
    ["config.js", normalizeCopy(stripComments(configJs))],
    ["app.js", normalizeCopy(stripComments(appJs))],
    ["index.html", normalizeCopy(stripHtmlComments(indexHtml))]
  ];

  for (const [name, normalized] of sources) {
    for (const pattern of DISALLOWED_TEMPLATE_PATTERNS) {
      assert.doesNotMatch(
        normalized,
        pattern,
        `${name} must not match disallowed pattern ${pattern}`
      );
    }
  }

  const masterCfg = loadMasterConfig(configJs);
  assert.equal(masterCfg.distributor.brandName, "");
  assert.equal(masterCfg.distributor.fullName, "");
  assert.equal(masterCfg.distributor.whatsappNumber, "");
  assert.equal(masterCfg.socialProof.enabled, false);
  assert.equal(masterCfg.testimonials.enabled, false);
  assert.equal(masterCfg.vsl.videoTitle, "Ver presentación de negocio");
  assert.equal(masterCfg.vsl.durationText, undefined);
});

test("template renders safe generic defaults, fixed disclosure, WhatsApp CTAs, and generic VSL when businessLandingContent is absent", async () => {
  const { configJs, appJs, indexHtml } = await readTemplateFiles();
  const masterCfg = loadMasterConfig(configJs);

  // Simulate composed partner config where businessMasterContent.ts stripped modelNotice
  // and even an adversarial modelNotice.enabled = false cannot hide the mandatory notice
  const partnerCfg = {
    ...masterCfg,
    site: {
      id: "claudia-calero-business",
      domain: "negocio.claudiacalero.pro",
      title: "Presentación de Negocio — Claudia Calero"
    },
    distributor: {
      brandName: "Claudia Calero",
      firstName: "Claudia",
      fullName: "Claudia Calero",
      role: "Distribuidora Independiente",
      whatsappNumber: "573177894541",
      defaultMessage: "Hola Claudia, quiero conocer la oportunidad de negocio"
    },
    cta: {
      primaryText: "Quiero Participar y Registrarme", // legacy unsafe label should be sanitized
      secondaryText: "Conocer la oportunidad",
      guaranteeText: "Cupos limitados por zona", // legacy unsafe urgency should be sanitized
      primaryUrl: "https://wa.me/573177894541?text=Hola%20Claudia",
      secondaryUrl: "https://wa.me/573177894541?text=Hola%20Claudia",
      directRegisterUrl: ""
    },
    modelNotice: { enabled: false }
  };

  const env = createDomEnvironment(indexHtml, partnerCfg);
  runInNewContext(appJs, env.window, { timeout: 1000 });
  env.triggerDOMContentLoaded();

  // 1. Mandatory near-CTA disclosure must remain visible and contain required elements
  const noticeBox = env.document.getElementById("heroModelNotice");
  assert.ok(noticeBox, "heroModelNotice must exist in DOM");
  assert.notEqual(noticeBox.style.display, "none", "disclosure cannot be hidden");
  assert.equal(noticeBox.hidden, false, "disclosure cannot have hidden=true");
  const noticeText = normalizeCopy(noticeBox.textContent);
  assert.match(noticeText, /venta directa/);
  assert.match(noticeText, /independiente/);
  assert.match(noticeText, /inversion/);
  assert.match(noticeText, /trabajo comercial/);
  assert.match(noticeText, /acompanamiento/);
  assert.match(noticeText, /no es una oferta de empleo|no constituye relacion laboral/);

  // 2. CTA labels must be restricted to WhatsApp intent and preserve button IDs
  for (const id of ["btnNavContact", "main-vsl-cta", "secondary-vsl-cta", "btnRegisterFinal", "btnContactNegocioWa"]) {
    const btn = env.document.getElementById(id);
    assert.ok(btn, `button #${id} must be preserved`);
    assert.match(btn.getAttribute("href") || "", /^https:\/\/wa\.me\/573177894541\?text=/);
  }
  const primaryTextEl = env.document.getElementById("ctaPrimaryText");
  const secondaryTextEl = env.document.getElementById("ctaSecondaryText");
  assert.equal(primaryTextEl.textContent, "Hablar por WhatsApp");
  assert.equal(secondaryTextEl.textContent, "Conocer la oportunidad");

  const guaranteeEl = env.document.getElementById("ctaGuaranteeText");
  assert.doesNotMatch(normalizeCopy(guaranteeEl.textContent), /cupos limitados/);

  // 3. VSL must be visible with generic title "Ver presentación de negocio" and no unverified duration
  const vslDurationEl = env.document.getElementById("vslDurationText");
  assert.equal(vslDurationEl.textContent, "Ver presentación de negocio");
  const vslCaptionEl = env.document.getElementById("vslCaption");
  assert.doesNotMatch(normalizeCopy(vslCaptionEl.textContent), /\b\d+\s*min/);
  assert.doesNotMatch(normalizeCopy(vslCaptionEl.textContent), /oficial/);

  // 4. Unverified claims, social proof, and testimonials disabled/hidden by default
  const trustRow = env.document.getElementById("trustHighlightsRow");
  assert.ok(!trustRow || trustRow.style.display === "none" || trustRow.hidden);
  const socialProof = env.document.getElementById("hero-social-proof");
  assert.ok(!socialProof || socialProof.style.display === "none" || socialProof.hidden);
  // Also verify when modelNotice is completely omitted (as businessMasterContent.ts does)
  const omittedNoticeCfg = { ...partnerCfg };
  delete omittedNoticeCfg.modelNotice;
  const envOmitted = createDomEnvironment(indexHtml, omittedNoticeCfg);
  runInNewContext(appJs, envOmitted.window, { timeout: 1000 });
  envOmitted.triggerDOMContentLoaded();
  const omittedNoticeBox = envOmitted.document.getElementById("heroModelNotice");
  assert.notEqual(omittedNoticeBox.style.display, "none", "disclosure must remain visible when modelNotice is omitted by businessMasterContent");
  assert.equal(omittedNoticeBox.hidden, false);
});

test("template renders Claudia's approved businessLandingContent profile (autonomy, university students, accompaniment, youth blue/lime/white)", async () => {
  const { configJs, appJs, indexHtml } = await readTemplateFiles();
  const masterCfg = loadMasterConfig(configJs);

  const claudiaProfile = {
    hero: {
      headline: "Construye autonomía comercial mientras avanzas en la universidad",
      subheadline: "Desarrolla habilidades reales de venta directa con horarios adaptables a tus clases y acompañamiento paso a paso desde el primer día.",
      desktopImageUrl: "https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp",
      mobileImageUrl: "https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp"
    },
    benefits: [
      {
        title: "Autonomía para universitarios",
        description: "Organiza tus bloques de actividad comercial sin descuidar tus horarios de estudio ni tus proyectos académicos."
      },
      {
        title: "Acompañamiento cercano",
        description: "Recibe orientación práctica desde el inicio para aprender a comunicarte con clientes y estructurar tu trabajo."
      },
      {
        title: "Aprendizaje comercial real",
        description: "Desarrolla habilidades de presentación, negociación ética y gestión de clientes aplicables a tu crecimiento profesional."
      }
    ],
    theme: {
      fontPreset: "modern",
      palettePreset: "indigo-lime"
    },
    dedicationText: "Puedes empezar desde 2 horas semanales, con acompañamiento desde el inicio. La dedicación para desarrollar la actividad depende de tus objetivos y tareas; no garantiza resultados."
  };

  const cfg = {
    ...masterCfg,
    distributor: {
      brandName: "Claudia Calero",
      firstName: "Claudia",
      fullName: "Claudia Calero",
      role: "Distribuidora Independiente",
      whatsappNumber: "573177894541"
    },
    businessLandingContent: claudiaProfile
  };

  const env = createDomEnvironment(indexHtml, cfg);
  runInNewContext(appJs, env.window, { timeout: 1000 });
  env.triggerDOMContentLoaded();

  assert.equal(env.document.getElementById("heroHeadline").textContent, claudiaProfile.hero.headline);
  assert.equal(env.document.getElementById("heroSubheadline").textContent, claudiaProfile.hero.subheadline);

  const benefitsGrid = env.document.getElementById("benefits-grid");
  assert.equal(benefitsGrid.children.length, 3);
  assert.match(benefitsGrid.children[0].textContent, /Autonomía para universitarios/);
  assert.match(benefitsGrid.children[1].textContent, /Acompañamiento cercano/);

  const faqAccordion = env.document.getElementById("faq-accordion");
  assert.match(faqAccordion.textContent, /Puedes empezar desde 2 horas semanales, con acompañamiento desde el inicio\./);

  const root = env.document.documentElement;
  assert.equal(root.getAttribute("data-palette"), "indigo-lime");
  assert.equal(root.style.getPropertyValue("--accent-color"), "#84CC16");
  const heroSection = env.document.getElementById("hero-vsl");
  assert.equal(
    heroSection.getAttribute("data-hero-desktop-image"),
    "https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp"
  );
});

test("template escapes HTML-like profile strings as literal text, rejects foreign media hosts, and falls back safely on malformed profile", async () => {
  const { configJs, appJs, indexHtml } = await readTemplateFiles();
  const masterCfg = loadMasterConfig(configJs);

  // Case 1: HTML/script-like strings in profile must render via textContent (never executable DOM)
  // and foreign image URLs must be rejected in favor of canonical fallback
  const xssAttemptProfile = {
    hero: {
      headline: "<script>window.__xssExecuted = true;</script>Titular Seguro",
      subheadline: "<img src=x onerror=alert(1)>Subtítulo como texto plano",
      desktopImageUrl: "https://evil.example/steal.webp",
      mobileImageUrl: "https://media.partnerhub.club/comunes/business/../secret.webp"
    },
    benefits: [
      {
        title: "<svg onload=alert(1)>Beneficio 1",
        description: "Descripción <script>maliciosa</script> literal"
      }
    ],
    theme: {
      fontPreset: "unsupported-font",
      palettePreset: "unsupported-palette"
    },
    dedicationText: "<b>2 horas semanales</b> como texto literal; no garantiza resultados."
  };

  const env1 = createDomEnvironment(indexHtml, {
    ...masterCfg,
    businessLandingContent: xssAttemptProfile
  });
  runInNewContext(appJs, env1.window, { timeout: 1000 });
  env1.triggerDOMContentLoaded();

  assert.equal(env1.window.__xssExecuted, undefined);
  assert.equal(
    env1.document.getElementById("heroHeadline").textContent,
    "<script>window.__xssExecuted = true;</script>Titular Seguro"
  );
  assert.equal(
    env1.document.getElementById("heroHeadline").children.length,
    0,
    "headline must not create child DOM elements from HTML strings"
  );
  const heroSection1 = env1.document.getElementById("hero-vsl");
  assert.equal(
    heroSection1.getAttribute("data-hero-desktop-image"),
    "https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp"
  );
  assert.equal(
    heroSection1.getAttribute("data-hero-mobile-image"),
    "https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp"
  );

  // Case 2: Malformed objects / prohibited claims in profile fall back to generic master without [object Object]
  const malformedProfile = {
    hero: {
      headline: { nested: "bad" },
      subheadline: "Construye Libertad Financiera con ingresos residuales sostenibles"
    },
    benefits: "not-an-array",
    theme: null,
    dedicationText: { bad: true }
  };

  const env2 = createDomEnvironment(indexHtml, {
    ...masterCfg,
    businessLandingContent: malformedProfile
  });
  runInNewContext(appJs, env2.window, { timeout: 1000 });
  env2.triggerDOMContentLoaded();

  const headline2 = env2.document.getElementById("heroHeadline").textContent;
  const subheadline2 = env2.document.getElementById("heroSubheadline").textContent;
  assert.doesNotMatch(headline2, /\[object Object\]/);
  assert.equal(headline2, masterCfg.hero.headline);
  assert.equal(subheadline2, masterCfg.hero.subheadline);
  assert.equal(env2.document.getElementById("benefits-grid").children.length, 4);
});
