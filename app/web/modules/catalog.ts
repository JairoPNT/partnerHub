export type ModuleSlug =
  | "dashboard"
  | "partners"
  | "plans"
  | "payments"
  | "master-site"
  | "landing-builder"
  | "vsl-builder"
  | "creative-assets"
  | "campaigns"
  | "automations"
  | "domains"
  | "settings";

export type ModuleRecord = {
  slug: ModuleSlug;
  name: string;
  group: "Core" | "Operations" | "Growth";
  status: "Foundation" | "Planned";
  description: string;
  intent: string;
  focus: string[];
  outputs: string[];
  notYet: string[];
};

export const moduleCatalog: ModuleRecord[] = [
  {
    slug: "dashboard",
    name: "Dashboard",
    group: "Core",
    status: "Foundation",
    description: "Control center para ver estado general, actividad y prioridades.",
    intent: "Dar visibilidad ejecutiva del sistema sin entrar en operación profunda.",
    focus: ["Resumen de cuenta", "Metrica de sitios", "Seguimiento de entregas"],
    outputs: ["Vista general", "Atajos de operacion", "Indicadores base"],
    notYet: ["Analitica avanzada", "Personalizacion por rol"]
  },
  {
    slug: "partners",
    name: "Partners",
    group: "Core",
    status: "Foundation",
    description: "Gestion central de empresarios, lideres y estados de cuenta.",
    intent: "Mantener una ficha unificada por partner con su ciclo comercial.",
    focus: ["Alta de partner", "Perfil comercial", "Estado y plan"],
    outputs: ["Listado", "Detalle", "Estados"],
    notYet: ["CRM completo", "Pipeline comercial sofisticado"]
  },
  {
    slug: "plans",
    name: "Plans",
    group: "Core",
    status: "Foundation",
    description: "Definicion de planes, precios, beneficios y upgrade paths.",
    intent: "Separar el producto tecnico del empaquetado comercial.",
    focus: ["Planes iniciales", "Mensualidad", "Upgrade"],
    outputs: ["Catalogo de planes", "Reglas de cobro", "Relaciones con partners"],
    notYet: ["Billing complejo", "Prorrateos"]
  },
  {
    slug: "payments",
    name: "Payments",
    group: "Operations",
    status: "Planned",
    description: "Registro de cobros de implementacion, mensualidad y extras.",
    intent: "Dar trazabilidad financiera al servicio recurrente.",
    focus: ["Registro manual", "Estados", "Vencimientos"],
    outputs: ["Historial de pagos", "Cuentas por cobrar", "Alertas"],
    notYet: ["Pasarela integrada", "Conciliacion automatica"]
  },
  {
    slug: "master-site",
    name: "Master Site",
    group: "Operations",
    status: "Foundation",
    description: "Fuente de verdad para contenido, promociones y material maestro.",
    intent: "Centralizar lo replicable y minimizar mantenimiento repetido.",
    focus: ["Productos", "Copys", "Recursos", "Promos"],
    outputs: ["Contenido maestro", "Versiones", "Replicacion"],
    notYet: ["Editor visual avanzado", "Workflow editorial completo"]
  },
  {
    slug: "landing-builder",
    name: "Landing Builder",
    group: "Operations",
    status: "Foundation",
    description: "Constructor de landings de producto para conversion directa.",
    intent: "Generar una pagina rapida, clara y editable por plantillas.",
    focus: ["Hero", "Beneficios", "CTA", "WhatsApp"],
    outputs: ["Landing base", "Bloques reutilizables", "Publicacion"],
    notYet: ["Drag and drop total", "A/B testing"]
  },
  {
    slug: "vsl-builder",
    name: "VSL Builder",
    group: "Operations",
    status: "Foundation",
    description: "Constructor de paginas para VSL de negocio y captacion.",
    intent: "Presentar oportunidad y objeciones en una experiencia guiada.",
    focus: ["Video principal", "Historia", "CTA", "Lead capture"],
    outputs: ["Pagina VSL", "Script base", "CTA controlado"],
    notYet: ["Video hosting avanzado", "Funnels complejos"]
  },
  {
    slug: "creative-assets",
    name: "Creative Assets",
    group: "Growth",
    status: "Foundation",
    description: "Biblioteca de piezas para campañas, social y ventas.",
    intent: "Organizar activos digitales listos para reutilizar.",
    focus: ["Imagenes", "Videos", "Copys", "Variantes"],
    outputs: ["Asset library", "Etiquetado", "Organizacion"],
    notYet: ["DAM completo", "Colaboracion avanzada"]
  },
  {
    slug: "campaigns",
    name: "Campaigns",
    group: "Growth",
    status: "Planned",
    description: "Gestion de briefs, creativos, presupuestos y resultados.",
    intent: "Conectar contenido, ads y seguimiento comercial.",
    focus: ["Brief", "UTM", "Presupuesto", "Estado"],
    outputs: ["Ficha de campana", "Control de ejecucion", "Referencias"],
    notYet: ["Ads manager", "Optimización automatica"]
  },
  {
    slug: "automations",
    name: "Automations",
    group: "Growth",
    status: "Planned",
    description: "Catalogo de automatizaciones y flujos con n8n.",
    intent: "Reducir trabajo manual en alta, entrega y actualizaciones.",
    focus: ["Alta", "Publicacion", "Alertas", "Sync"],
    outputs: ["Flujos", "Disparadores", "Logs"],
    notYet: ["Orquestacion compleja", "Rutas de error detalladas"]
  },
  {
    slug: "domains",
    name: "Domains",
    group: "Operations",
    status: "Foundation",
    description: "Control de dominios, asignaciones y estado tecnico.",
    intent: "Tener trazabilidad de cada dominio por sitio o partner.",
    focus: ["Registro", "Asignacion", "Renovacion"],
    outputs: ["Inventario", "Estado", "Vinculos"],
    notYet: ["DNS manager completo", "Auto provisioning"]
  },
  {
    slug: "settings",
    name: "Settings",
    group: "Core",
    status: "Foundation",
    description: "Configuracion general, integraciones y seguridad.",
    intent: "Preparar la base de identidad, acceso y reglas globales.",
    focus: ["Branding", "Usuarios", "Integraciones"],
    outputs: ["Config general", "Acceso", "Preferencias"],
    notYet: ["RBAC avanzado", "Auditoria profunda"]
  }
];

export const moduleNavigation = moduleCatalog.map(({ slug, name, description, group }) => ({
  href: `/${slug}`,
  name,
  description,
  group
}));

export function getModule(slug: string) {
  return moduleCatalog.find((module) => module.slug === slug);
}

