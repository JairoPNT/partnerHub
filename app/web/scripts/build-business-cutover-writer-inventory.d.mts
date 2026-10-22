export type BusinessCutoverWriterInventory = Readonly<{ version: 1;
  releaseId: "business-consent-predecessor-v1" | "business-consent-successor-v1";
  files: readonly Readonly<{ path: string; sha256: string; size: number }>[] }>;
export function validateBusinessCutoverWriterInventory(value: unknown): BusinessCutoverWriterInventory;
export function buildBusinessCutoverWriterInventory(): Promise<BusinessCutoverWriterInventory>;
