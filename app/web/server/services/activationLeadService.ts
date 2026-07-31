import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { manualReferralService } from "@/server/services/manualReferralService";

const siteIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

const referralCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9_-]+$/i, "referrerCode contains unsupported characters")
  .transform((value) => value.toUpperCase());

export const activationLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  brandName: z.string().trim().min(2).max(160),
  mainProduct: z.string().trim().max(240).optional().default(""),
  referrerCode: referralCodeSchema.optional().nullable(),
  paymentMethod: z.enum(["wompi", "direct"]),
  termsAccepted: z.literal(true)
});

export const onboardingDataSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((val) => val.replace(/^https?:\/\//i, "").replace(/\/.*$/, ""))
    .pipe(z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Formato de dominio inválido (ej. dorianhiguita.pro)"))
    .optional(),
  country: z.string().trim().max(80).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  purchaseUrl: z.string().trim().url().max(2048).optional(),
  heroDesktopUrl: z.string().trim().url().max(2048).optional(),
  heroMobileUrl: z.string().trim().url().max(2048).optional(),
  logoMode: z.enum(["TYPOGRAPHY", "IMAGE"]).optional(),
  logoUrl: z.string().trim().url().max(2048).optional(),
  faviconUrl: z.string().trim().url().max(2048).optional(),
  seoTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  defaultMessage: z.string().trim().max(500).optional(),
  analyticsMeasurementId: z.string().trim().regex(/^G-[A-Z0-9]+$/i).optional(),
  fontPreset: z.enum(["executive", "modern", "editorial", "friendly", "premium", "minimal"]).optional(),
  palettePreset: z.enum(["cobalt-cyan", "emerald-slate", "coffee-gold", "rose-graphite", "indigo-lime", "teal-navy", "wine-blush", "forest-mint", "charcoal-amber", "sky-stone"]).optional(),
  operatorNotes: z.string().trim().max(2000).optional(),
  analyticsVerified: z.boolean().optional(),
  metaPixelId: z.string().trim().optional(),
  googleAdsConversionId: z.string().trim().optional(),
  imageUseConsent: z.boolean().optional(),
  agreementAccepted: z.boolean().optional()
}).partial();

export const linkActivationLeadSchema = z.object({
  siteId: siteIdSchema
});

export const activationLeadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "PAID",
  "CONVERTED",
  "CANCELLED"
]);

export const activationLeadRecordStateSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export const publicationStateSchema = z.enum([
  "NOT_STARTED",
  "GENERATED",
  "PUBLISHED",
  "VERIFIED",
  "VERIFY_FAILED"
]);

export const editableOnboardingDataSchema = onboardingDataSchema.omit({
  imageUseConsent: true,
  agreementAccepted: true
});

export const updateActivationLeadSchema = z.object({
  status: activationLeadStatusSchema.optional(),
  fullName: z.string().trim().min(2).max(160).optional(),
  whatsapp: z.string().trim().min(7).max(40).optional(),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).nullable().optional(),
  brandName: z.string().trim().min(2).max(160).optional(),
  mainProduct: z.string().trim().max(240).optional(),
  referrerCode: referralCodeSchema.optional().nullable(),
  paymentMethod: z.enum(["wompi", "direct"]).optional(),
  onboardingData: editableOnboardingDataSchema.optional()
});

export const internalActivationLeadCreateSchema = activationLeadSchema.extend({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).nullable().optional(),
  status: activationLeadStatusSchema.default("NEW"),
  siteId: siteIdSchema.nullable().optional(),
  onboardingData: onboardingDataSchema.optional()
});

type ActivationLead = Omit<z.infer<typeof activationLeadSchema>, "email"> & {
  email: string | null;
  id: string;
  status: z.infer<typeof activationLeadStatusSchema>;
  siteId: string | null;
  createdAt: string;
  updatedAt: string;
  recordState?: z.infer<typeof activationLeadRecordStateSchema>;
  publicationState?: z.infer<typeof publicationStateSchema>;
  onboardingTokenHash: string;
  onboardingData: z.infer<typeof onboardingDataSchema>;
  onboardingUpdatedAt?: string;
};

function getStorageDirectory() {
  return process.env.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation";
}

function getStoragePath() {
  return resolve(getStorageDirectory(), "leads.json");
}

async function readLeads() {
  try {
    return JSON.parse(await readFile(getStoragePath(), "utf8")) as ActivationLead[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLeads(leads: ActivationLead[]) {
  const directory = resolve(getStorageDirectory());
  const target = getStoragePath();
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

function hashOnboardingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicLead(lead: ActivationLead) {
  const { onboardingTokenHash: _tokenHash, ...publicLead } = lead;
  return {
    ...publicLead,
    recordState: lead.recordState ?? "ACTIVE",
    publicationState: lead.publicationState ?? "NOT_STARTED"
  };
}

async function create(input: z.infer<typeof activationLeadSchema>) {
  const parsed = activationLeadSchema.parse(input);
  const leads = await readLeads();
  const now = new Date().toISOString();
  const onboardingToken = randomUUID();
  const lead: ActivationLead = {
    ...parsed,
    id: randomUUID(),
    status: "NEW",
    recordState: "ACTIVE",
    publicationState: "NOT_STARTED",
    siteId: null,
    createdAt: now,
    updatedAt: now,
    onboardingTokenHash: hashOnboardingToken(onboardingToken),
    onboardingData: {}
  };

  await writeLeads([...leads, lead]);
  return { lead: toPublicLead(lead), onboardingToken };
}

async function createInternal(input: z.infer<typeof internalActivationLeadCreateSchema>) {
  const parsed = internalActivationLeadCreateSchema.parse(input);
  const leads = await readLeads();
  const now = new Date().toISOString();
  const onboardingToken = randomUUID();
  const lead: ActivationLead = {
    fullName: parsed.fullName,
    whatsapp: parsed.whatsapp,
    email: parsed.email ?? null,
    brandName: parsed.brandName,
    mainProduct: parsed.mainProduct,
    referrerCode: parsed.referrerCode,
    paymentMethod: parsed.paymentMethod,
    termsAccepted: parsed.termsAccepted,
    id: randomUUID(),
    status: parsed.status,
    recordState: "ACTIVE",
    publicationState: "NOT_STARTED",
    siteId: parsed.siteId ?? null,
    createdAt: now,
    updatedAt: now,
    onboardingTokenHash: hashOnboardingToken(onboardingToken),
    onboardingData: parsed.onboardingData ?? {}
  };

  if (lead.referrerCode && lead.siteId) {
    await manualReferralService.createReferral({
      referredSiteId: lead.siteId,
      referrerCode: lead.referrerCode
    });
  }

  await writeLeads([...leads, lead]);
  return {
    lead: toPublicLead(lead),
    onboardingToken,
    onboardingPath: `/onboarding/${onboardingToken}`
  };
}

async function list(options: { includeArchived?: boolean } = {}) {
  const leads = await readLeads();
  const visible = options.includeArchived
    ? leads
    : leads.filter((lead) => (lead.recordState ?? "ACTIVE") === "ACTIVE");
  return visible.map(toPublicLead);
}

async function getByOnboardingToken(token: string) {
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.onboardingTokenHash === hashOnboardingToken(token));
  if (!existing) throw new Error("Onboarding link was not found or has expired.");
  return toPublicLead(existing);
}

async function getBySiteId(siteId: string) {
  const parsedSiteId = siteIdSchema.parse(siteId);
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.siteId === parsedSiteId);
  return existing ? toPublicLead(existing) : null;
}

async function updateOnboarding(token: string, input: z.infer<typeof onboardingDataSchema>) {
  const parsed = onboardingDataSchema.parse(input);
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.onboardingTokenHash === hashOnboardingToken(token));
  if (!existing) throw new Error("Onboarding link was not found or has expired.");

  const now = new Date().toISOString();
  const next: ActivationLead = {
    ...existing,
    onboardingData: { ...existing.onboardingData, ...parsed },
    onboardingUpdatedAt: now,
    updatedAt: now
  };

  await writeLeads(leads.map((lead) => (lead.id === existing.id ? next : lead)));
  return toPublicLead(next);
}

async function linkSite(id: string, input: z.infer<typeof linkActivationLeadSchema>) {
  const parsed = linkActivationLeadSchema.parse(input);
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.id === id);

  if (!existing) throw new Error(`Activation lead ${id} was not found.`);
  if (existing.siteId && existing.siteId !== parsed.siteId) {
    throw new Error(`Activation lead ${id} is already linked to ${existing.siteId}.`);
  }

  let referral = null;
  if (existing.referrerCode && !existing.siteId) {
    referral = await manualReferralService.createReferral({
      referredSiteId: parsed.siteId,
      referrerCode: existing.referrerCode
    });
  }

  const next: ActivationLead = {
    ...existing,
    siteId: parsed.siteId,
    status: existing.status === "NEW" ? "CONTACTED" : existing.status,
    updatedAt: new Date().toISOString()
  };

  await writeLeads(leads.map((lead) => (lead.id === id ? next : lead)));
  return { lead: toPublicLead(next), referral };
}

async function updateStatus(id: string, input: z.infer<typeof updateActivationLeadSchema>) {
  const parsed = updateActivationLeadSchema.parse(input);
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.id === id);

  if (!existing) throw new Error(`Activation lead ${id} was not found.`);

  const hasEditableField = Object.keys(parsed).some((key) => key !== "status");
  if (!parsed.status && !hasEditableField) {
    throw new Error("At least one activation lead field must be provided.");
  }

  const next: ActivationLead = {
    ...existing,
    status: parsed.status ?? existing.status,
    fullName: parsed.fullName ?? existing.fullName,
    whatsapp: parsed.whatsapp ?? existing.whatsapp,
    email: parsed.email === undefined ? existing.email : parsed.email,
    brandName: parsed.brandName ?? existing.brandName,
    mainProduct: parsed.mainProduct ?? existing.mainProduct,
    referrerCode: parsed.referrerCode === undefined ? existing.referrerCode : parsed.referrerCode,
    paymentMethod: parsed.paymentMethod ?? existing.paymentMethod,
    onboardingData: parsed.onboardingData
      ? { ...existing.onboardingData, ...parsed.onboardingData }
      : existing.onboardingData,
    onboardingUpdatedAt: parsed.onboardingData ? new Date().toISOString() : existing.onboardingUpdatedAt,
    updatedAt: new Date().toISOString()
  };

  await writeLeads(leads.map((lead) => (lead.id === id ? next : lead)));
  return toPublicLead(next);
}

async function updateRecordState(id: string, recordState: z.infer<typeof activationLeadRecordStateSchema>) {
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.id === id);

  if (!existing) throw new Error(`Activation lead ${id} was not found.`);

  const next: ActivationLead = {
    ...existing,
    recordState,
    updatedAt: new Date().toISOString()
  };

  await writeLeads(leads.map((lead) => (lead.id === id ? next : lead)));
  return toPublicLead(next);
}

async function updatePublicationStateBySiteId(
  siteId: string,
  publicationState: z.infer<typeof publicationStateSchema>
) {
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.siteId === siteId);
  if (!existing) return null;

  const next: ActivationLead = {
    ...existing,
    publicationState,
    updatedAt: new Date().toISOString()
  };

  await writeLeads(leads.map((lead) => (lead.id === existing.id ? next : lead)));
  return toPublicLead(next);
}

async function deleteTest(id: string, confirmation: string) {
  if (confirmation !== "DELETE_TEST") {
    throw new Error("Test deletion requires explicit confirmation.");
  }

  const leads = await readLeads();
  const existing = leads.find((lead) => lead.id === id);

  if (!existing) throw new Error(`Activation lead ${id} was not found.`);
  if (existing.siteId || ["PAID", "CONVERTED"].includes(existing.status)) {
    throw new Error("Linked or paid entrepreneurs cannot be deleted as tests.");
  }

  await writeLeads(leads.filter((lead) => lead.id !== id));
  return { id, deleted: true };
}

export const activationLeadService = {
  create,
  createInternal,
  list,
  getBySiteId,
  getByOnboardingToken,
  updateOnboarding,
  linkSite,
  updateStatus,
  updateRecordState,
  updatePublicationStateBySiteId,
  deleteTest
};
