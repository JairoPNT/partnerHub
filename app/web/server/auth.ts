/**
 * Draft auth scaffold for PartnerHub.
 *
 * Next step:
 * - wire Auth.js/NextAuth providers
 * - plug Prisma adapter
 * - add sign-in route and protected dashboard
 */

export const authDraft = {
  strategy: "session",
  providerPlan: ["credentials", "google"],
  adapter: "prisma"
} as const;

