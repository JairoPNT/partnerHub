export type ManualPaymentEcosystem = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
export type ManualPaymentPricingMode = "CATALOG" | "MANUAL_NEGOTIATED";

export interface ManualPaymentCommercialSnapshot {
  version: 1;
  offerCode: string | null;
  ecosystemTypes: ManualPaymentEcosystem[];
  pricingMode: ManualPaymentPricingMode;
  amountCop: number;
  currency: "COP";
  selectedAt: string;
}

export const CATALOG_OFFERS = {
  PLAN_360: {
    offerCode: "PLAN_360",
    name: "Plan 360 (Todos los ecosistemas)",
    amountCop: 350000,
    ecosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as ManualPaymentEcosystem[],
    description: "Producto + Negocio VSL + Marca Personal ($350.000 COP)"
  },
  PRODUCT_ONLY: {
    offerCode: "PRODUCT_ONLY",
    name: "Solo Ecosistema de Producto",
    amountCop: 180000,
    ecosystems: ["PRODUCT"] as ManualPaymentEcosystem[],
    description: "Landing comercial de producto ($180.000 COP)"
  },
  BUSINESS_ONLY: {
    offerCode: "BUSINESS_ONLY",
    name: "Solo Ecosistema de Negocio",
    amountCop: 180000,
    ecosystems: ["BUSINESS"] as ManualPaymentEcosystem[],
    description: "Negocio VSL ($180.000 COP)"
  },
  PERSONAL_BRAND_ONLY: {
    offerCode: "PERSONAL_BRAND_ONLY",
    name: "Solo Marca Personal",
    amountCop: 100000,
    ecosystems: ["PERSONAL_BRAND"] as ManualPaymentEcosystem[],
    description: "Marca personal ($100.000 COP)"
  }
} as const;

export const ECOSYSTEM_LABELS: Record<ManualPaymentEcosystem, { name: string; color: string }> = {
  PRODUCT: { name: "Producto", color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  BUSINESS: { name: "Negocio (VSL)", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  PERSONAL_BRAND: { name: "Marca Personal", color: "bg-emerald-50 text-emerald-800 border-emerald-200" }
};
