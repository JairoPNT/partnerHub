export type FontPreset =
  | "executive"
  | "modern"
  | "editorial"
  | "friendly"
  | "premium"
  | "minimal";

export type PalettePreset =
  | "cobalt-cyan"
  | "emerald-slate"
  | "coffee-gold"
  | "rose-graphite"
  | "indigo-lime"
  | "teal-navy"
  | "wine-blush"
  | "forest-mint"
  | "charcoal-amber"
  | "sky-stone";

export interface FontPresetMeta {
  id: FontPreset;
  name: string;
  fonts: string;
  description: string;
  sampleText: string;
}

export interface PalettePresetMeta {
  id: PalettePreset;
  name: string;
  baseColor: string; // Hex color for base/dark
  accentColor: string; // Hex color for accent
  secondaryBg: string; // Tailored light background preview
  badgeText: string;
}

export const FONT_PRESETS: FontPresetMeta[] = [
  {
    id: "executive",
    name: "Ejecutivo",
    fonts: "Montserrat + Space Grotesk",
    description: "Estructurado, autoritario y enfocado en negocios.",
    sampleText: "Visión y Liderazgo Comercial"
  },
  {
    id: "modern",
    name: "Moderno",
    fonts: "Outfit + Inter",
    description: "Limpio, dinámico y con estética digital contemporánea.",
    sampleText: "Innovación y Claridad Digital"
  },
  {
    id: "editorial",
    name: "Editorial",
    fonts: "Playfair Display + Lora",
    description: "Elegante, narrativo y con presencia sofisticada.",
    sampleText: "Elegancia y Tradición de Marca"
  },
  {
    id: "friendly",
    name: "Cercano",
    fonts: "Poppins + DM Sans",
    description: "Cálido, accesible y enfocado en la comunidad.",
    sampleText: "Bienestar y Confianza Directa"
  },
  {
    id: "premium",
    name: "Premium",
    fonts: "Manrope + Lora",
    description: "Lujoso, distintivo y de alto valor percibido.",
    sampleText: "Exclusividad y Calidad Superior"
  },
  {
    id: "minimal",
    name: "Minimalista",
    fonts: "Inter",
    description: "Directo, funcional, enfocado 100% en el producto.",
    sampleText: "Simplicidad y Enfoque Directo"
  }
];

export const PALETTE_PRESETS: PalettePresetMeta[] = [
  {
    id: "cobalt-cyan",
    name: "Cobalto & Cian",
    baseColor: "#0F172A",
    accentColor: "#06B6D4",
    secondaryBg: "#ECFEFF",
    badgeText: "Tecnológico / Corporativo"
  },
  {
    id: "emerald-slate",
    name: "Esmeralda & Pizarra",
    baseColor: "#022C22",
    accentColor: "#10B981",
    secondaryBg: "#ECFDF5",
    badgeText: "Salud & Bienestar"
  },
  {
    id: "coffee-gold",
    name: "Café & Oro",
    baseColor: "#271C19",
    accentColor: "#D97706",
    secondaryBg: "#FFFBEB",
    badgeText: "Cálido & Orgánico"
  },
  {
    id: "rose-graphite",
    name: "Rosa & Grafito",
    baseColor: "#18181B",
    accentColor: "#F43F5E",
    secondaryBg: "#FFF1F2",
    badgeText: "Moderno & Audaz"
  },
  {
    id: "indigo-lime",
    name: "Índigo & Lima",
    baseColor: "#1E1B4B",
    accentColor: "#84CC16",
    secondaryBg: "#F7FEE7",
    badgeText: "Energía & Contraste"
  },
  {
    id: "teal-navy",
    name: "Azul Verdoso & Marino",
    baseColor: "#0A192F",
    accentColor: "#14B8A6",
    secondaryBg: "#F0FDFA",
    badgeText: "Confianza & Serenidad"
  },
  {
    id: "wine-blush",
    name: "Vino & Rubor",
    baseColor: "#2A0813",
    accentColor: "#FB7185",
    secondaryBg: "#FFF1F2",
    badgeText: "Distinción & Calidez"
  },
  {
    id: "forest-mint",
    name: "Bosque & Menta",
    baseColor: "#052E16",
    accentColor: "#34D399",
    secondaryBg: "#ECFDF5",
    badgeText: "Vitalidad Natural"
  },
  {
    id: "charcoal-amber",
    name: "Carbón & Ámbar",
    baseColor: "#171717",
    accentColor: "#F59E0B",
    secondaryBg: "#FFFBEB",
    badgeText: "Premium & Fuerte"
  },
  {
    id: "sky-stone",
    name: "Cielo & Piedra",
    baseColor: "#0C4A6E",
    accentColor: "#38BDF8",
    secondaryBg: "#F0F9FF",
    badgeText: "Fresco & Balanceado"
  }
];

export function getFontPresetMeta(id?: string): FontPresetMeta {
  return (
    FONT_PRESETS.find((f) => f.id === id) || FONT_PRESETS[0]
  );
}

export function getPalettePresetMeta(id?: string): PalettePresetMeta {
  return (
    PALETTE_PRESETS.find((p) => p.id === id) || PALETTE_PRESETS[0]
  );
}
