type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

type OfferSnapshotContract = {
  offerCode: string;
  ecosystemTypes: EcosystemType[];
};

export function assertActivationOfferEcosystemUpdate(
  offerSnapshot: OfferSnapshotContract | undefined,
  ecosystemType: EcosystemType | undefined
) {
  if (offerSnapshot === undefined || ecosystemType === undefined) return;

  if (offerSnapshot.ecosystemTypes.length !== 1) {
    throw new Error(`${offerSnapshot.offerCode} must not use a single ecosystemType.`);
  }

  const expectedEcosystemType = offerSnapshot.ecosystemTypes[0];
  if (ecosystemType !== expectedEcosystemType) {
    throw new Error(
      `${offerSnapshot.offerCode} requires ecosystemType ${expectedEcosystemType}.`
    );
  }
}
