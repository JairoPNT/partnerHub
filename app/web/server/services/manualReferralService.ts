import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const siteIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

const referralCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9_-]+$/i, "referral code contains unsupported characters")
  .transform((value) => value.toUpperCase());

export const manualReferralStatusSchema = z.enum([
  "PENDING",
  "VALIDATED",
  "QUALIFIED",
  "REJECTED",
  "CANCELLED"
]);

export const assignReferralCodeSchema = z.object({
  siteId: siteIdSchema,
  code: referralCodeSchema,
  displayName: z.string().trim().min(1).max(120)
});

export const createReferralSchema = z.object({
  referredSiteId: siteIdSchema,
  referrerCode: referralCodeSchema
});

export const updateReferralSchema = z.object({
  status: manualReferralStatusSchema
});

type ReferralCodeRecord = z.infer<typeof assignReferralCodeSchema> & {
  assignedAt: string;
};

type ReferralRecord = z.infer<typeof createReferralSchema> & {
  id: string;
  referrerSiteId: string | null;
  status: z.infer<typeof manualReferralStatusSchema>;
  createdAt: string;
  validatedAt?: string;
  qualifiedAt?: string;
};

function getStorageDirectory() {
  return process.env.PRODUCT_PAGE_REFERRAL_DIR ?? "/data/generated-sites/.referrals";
}

function getStoragePath(name: "codes" | "referrals") {
  return resolve(getStorageDirectory(), `${name}.json`);
}

async function readJson<T>(name: "codes" | "referrals", fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(getStoragePath(name), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson<T>(name: "codes" | "referrals", value: T) {
  const directory = resolve(getStorageDirectory());
  const target = getStoragePath(name);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

async function assignCode(input: z.infer<typeof assignReferralCodeSchema>) {
  const parsed = assignReferralCodeSchema.parse(input);
  const records = await readJson<ReferralCodeRecord[]>("codes", []);
  const existing = records.find((record) => record.code === parsed.code);

  if (existing && existing.siteId !== parsed.siteId) {
    throw new Error(`Referral code ${parsed.code} is already assigned to another site.`);
  }

  const next: ReferralCodeRecord = {
    ...parsed,
    assignedAt: existing?.assignedAt ?? new Date().toISOString()
  };

  await writeJson("codes", [...records.filter((record) => record.code !== parsed.code), next]);
  return next;
}

async function createReferral(input: z.infer<typeof createReferralSchema>) {
  const parsed = createReferralSchema.parse(input);
  const codes = await readJson<ReferralCodeRecord[]>("codes", []);
  const code = codes.find((record) => record.code === parsed.referrerCode);
  const referrals = await readJson<ReferralRecord[]>("referrals", []);

  if (referrals.some((record) => record.referredSiteId === parsed.referredSiteId)) {
    throw new Error(`A referral already exists for ${parsed.referredSiteId}.`);
  }

  const record: ReferralRecord = {
    ...parsed,
    id: randomUUID(),
    referrerSiteId: code?.siteId ?? null,
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  await writeJson("referrals", [...referrals, record]);
  return { ...record, codeFound: Boolean(code) };
}

async function list() {
  const [codes, referrals] = await Promise.all([
    readJson<ReferralCodeRecord[]>("codes", []),
    readJson<ReferralRecord[]>("referrals", [])
  ]);

  const qualifiedBySite = referrals.reduce<Record<string, number>>((counts, referral) => {
    if (referral.status === "QUALIFIED" && referral.referrerSiteId) {
      counts[referral.referrerSiteId] = (counts[referral.referrerSiteId] ?? 0) + 1;
    }
    return counts;
  }, {});

  return {
    codes,
    referrals,
    summary: Object.entries(qualifiedBySite).map(([siteId, qualifiedReferrals]) => ({
      siteId,
      qualifiedReferrals,
      earnedMonths: Math.floor(qualifiedReferrals / 2)
    }))
  };
}

async function updateStatus(id: string, status: z.infer<typeof manualReferralStatusSchema>) {
  const referrals = await readJson<ReferralRecord[]>("referrals", []);
  const existing = referrals.find((record) => record.id === id);

  if (!existing) throw new Error(`Referral ${id} was not found.`);

  const now = new Date().toISOString();
  const next: ReferralRecord = {
    ...existing,
    status,
    ...(status === "VALIDATED" ? { validatedAt: now } : {}),
    ...(status === "QUALIFIED" ? { qualifiedAt: now } : {})
  };

  await writeJson("referrals", referrals.map((record) => (record.id === id ? next : record)));
  return next;
}

export const manualReferralService = { assignCode, createReferral, list, updateStatus };
