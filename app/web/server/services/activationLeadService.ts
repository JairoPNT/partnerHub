import "server-only";

import { randomUUID } from "node:crypto";
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
  mainProduct: z.string().trim().min(2).max(240),
  referrerCode: referralCodeSchema.optional().nullable(),
  paymentMethod: z.enum(["wompi", "direct"]),
  termsAccepted: z.literal(true)
});

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

export const updateActivationLeadSchema = z.object({
  status: activationLeadStatusSchema
});

type ActivationLead = z.infer<typeof activationLeadSchema> & {
  id: string;
  status: z.infer<typeof activationLeadStatusSchema>;
  siteId: string | null;
  createdAt: string;
  updatedAt: string;
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

async function create(input: z.infer<typeof activationLeadSchema>) {
  const parsed = activationLeadSchema.parse(input);
  const leads = await readLeads();
  const now = new Date().toISOString();
  const lead: ActivationLead = {
    ...parsed,
    id: randomUUID(),
    status: "NEW",
    siteId: null,
    createdAt: now,
    updatedAt: now
  };

  await writeLeads([...leads, lead]);
  return lead;
}

async function list() {
  return readLeads();
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
  return { lead: next, referral };
}

async function updateStatus(id: string, input: z.infer<typeof updateActivationLeadSchema>) {
  const parsed = updateActivationLeadSchema.parse(input);
  const leads = await readLeads();
  const existing = leads.find((lead) => lead.id === id);

  if (!existing) throw new Error(`Activation lead ${id} was not found.`);

  const next: ActivationLead = {
    ...existing,
    status: parsed.status,
    updatedAt: new Date().toISOString()
  };

  await writeLeads(leads.map((lead) => (lead.id === id ? next : lead)));
  return next;
}

export const activationLeadService = {
  create,
  list,
  linkSite,
  updateStatus
};
