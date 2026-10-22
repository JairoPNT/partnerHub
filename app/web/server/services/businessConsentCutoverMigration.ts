// The authority module owns both private identity maps. Re-exporting from this
// connector keeps one graph in the administrative bundle and mints no factory.
export { captureBusinessConsentCutover, describeBusinessConsentCutover, applyBusinessConsentCutover,
  readBusinessConsentCutover } from "@/server/services/businessCutoverMigrationAuthority";
export type { BusinessConsentCutoverCapture, CutoverPreview } from "@/server/services/businessCutoverMigrationAuthority";
