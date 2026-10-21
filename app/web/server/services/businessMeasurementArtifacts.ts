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
        'a8844b5d9daf89083adb55293bc16e7f558ccf9afd87aaa0f2926ad17375313b',
      runtimeSha256:
        '497d0f954435101910ae6dee049feca65b44bd3050cb3e14b9c5640e70c07706',
      stylesSha256:
        '302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59',
      providers: Object.freeze({ ga4: false, meta: false })
    })
  ]);
