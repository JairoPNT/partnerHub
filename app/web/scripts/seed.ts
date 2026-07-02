/**
 * Seed scaffold for PartnerHub.
 *
 * Intentionally left as a placeholder until the first real tables and
 * onboarding flow are defined.
 */

export async function main() {
  console.log("PartnerHub seed scaffold ready.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

