import { productPageGenerationService } from "../services/productPageGenerationService";

type IsolatedGenerationPaths = {
  sourceDirectory: string;
  activationDirectory: string;
  paymentDirectory: string;
  commercialGrantDirectory: string;
  outputDirectory: string;
};

const environmentKeys = [
  "PRODUCT_PAGE_SOURCE_DIR",
  "PRODUCT_PAGE_ACTIVATION_DIR",
  "PRODUCT_PAGE_PAYMENT_DIR",
  "PRODUCT_PAGE_COMMERCIAL_GRANT_DIR",
  "PRODUCT_PAGE_OUTPUT_DIR"
] as const;

export async function generateJairoBusinessPackageIsolated(paths: IsolatedGenerationPaths) {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  process.env.PRODUCT_PAGE_SOURCE_DIR = paths.sourceDirectory;
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = paths.activationDirectory;
  process.env.PRODUCT_PAGE_PAYMENT_DIR = paths.paymentDirectory;
  process.env.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR = paths.commercialGrantDirectory;
  process.env.PRODUCT_PAGE_OUTPUT_DIR = paths.outputDirectory;

  try {
    return await productPageGenerationService.regenerateFromSavedSource(
      "jairo-pinto-business",
      { templateSource: "master", masterSiteId: "ganomaster-business" }
    );
  } finally {
    for (const key of environmentKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
