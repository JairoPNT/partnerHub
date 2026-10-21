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
export const APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS: readonly BusinessMeasurementArtifact[] =
  Object.freeze([
    Object.freeze({
      version: 1,
      indexHtmlSha256:
        '39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb',
      appJsSha256:
        'fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de',
      runtimeSha256:
        '78db567bbd5e6ab30aa9e2402bfa421aa043a7bad11ea046d56ef79df0dccf42',
      stylesSha256:
        '302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59',
      providers: Object.freeze({ ga4: false, meta: false })
    })
  ]);
