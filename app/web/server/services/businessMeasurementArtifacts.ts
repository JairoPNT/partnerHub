import 'server-only';

export type BusinessMeasurementArtifact = {
  version: 1;
  indexHtmlSha256: string;
  appJsSha256: string;
  runtimeSha256: string;
  stylesSha256: string;
  providers: { ga4: boolean; meta: boolean };
};

// Populated only by the separate, reviewed integration release. An ID is not
// evidence that a provider's automatic SDK data collection is safe to enable.
export const APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS: readonly BusinessMeasurementArtifact[] = Object.freeze([]);
