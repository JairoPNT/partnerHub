import { z } from "zod";

// Client-safe wire contract only. Never import server services or provider configuration here.
const revisionSchema = z.string().regex(/^[0-9a-f]{64}$/);
const safeCodeSchema = z.string().regex(/^[A-Z0-9_:-]{1,160}$/);
const blockedReasonsSchema = z.array(safeCodeSchema);
const nullableSiteIdSchema = z.string().min(1).nullable();
const nullablePublicHostSchema = z.string().min(1).nullable();

export const masterSitesBusinessStatusSchema = z.enum([
  "BLOCKED", "TARGET_REQUIRED", "TARGET_PENDING", "READY", "QUEUED", "RUNNING", "CURRENT", "FAILED"
]);
export type MasterSitesBusinessStatus = z.infer<typeof masterSitesBusinessStatusSchema>;

export const masterSitesBusinessOutcomeSchema = z.enum([
  "TARGET_READY", "TARGET_PENDING", "ENQUEUED", "ALREADY_CURRENT", "ALREADY_SCHEDULED", "BLOCKED", "RETRY_REQUIRED"
]);
export type MasterSitesBusinessOutcome = z.infer<typeof masterSitesBusinessOutcomeSchema>;

export const masterSitesSafeJobSchema = z.object({
  id: revisionSchema,
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  phase: z.enum(["QUEUED", "PREPARING_PACKAGE", "VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING", "COMPLETE"]),
  attemptCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  lastErrorCode: safeCodeSchema.optional()
}).strict();
export type MasterSitesSafeJob = z.infer<typeof masterSitesSafeJobSchema>;

export const masterSitesBusinessTemplateSchema = z.object({
  id: z.literal("ganomaster-business"),
  ecosystemType: z.literal("BUSINESS"),
  available: z.boolean(),
  revision: revisionSchema.nullable(),
  previewUrl: z.string().url().nullable(),
  blockedReasons: blockedReasonsSchema
}).strict();
export type MasterSitesBusinessTemplate = z.infer<typeof masterSitesBusinessTemplateSchema>;

export const masterSitesBusinessPartnerSchema = z.object({
  activationLeadId: z.string().uuid(),
  displayName: z.string(),
  siteId: nullableSiteIdSchema,
  publicHost: nullablePublicHostSchema,
  status: masterSitesBusinessStatusSchema,
  blockedReasons: blockedReasonsSchema,
  reviewRevision: revisionSchema.nullable(),
  canPrepareTarget: z.boolean(),
  canPublish: z.boolean(),
  currentJob: masterSitesSafeJobSchema.nullable()
}).strict();
export type MasterSitesBusinessPartner = z.infer<typeof masterSitesBusinessPartnerSchema>;

export const masterSitesBusinessReadResponseSchema = z.object({
  template: masterSitesBusinessTemplateSchema,
  partners: z.array(masterSitesBusinessPartnerSchema)
}).strict();
export type MasterSitesBusinessReadResponse = z.infer<typeof masterSitesBusinessReadResponseSchema>;

const commandFields = {
  requestId: z.string().uuid(),
  activationLeadId: z.string().uuid(),
  templateId: z.literal("ganomaster-business"),
  expectedRevision: revisionSchema
};
export const masterSitesBusinessPrepareTargetRequestSchema = z.object({
  ...commandFields,
  confirmation: z.literal("PREPARE_SELECTED_BUSINESS_TARGET")
}).strict();
export type MasterSitesBusinessPrepareTargetRequest = z.infer<typeof masterSitesBusinessPrepareTargetRequestSchema>;

export const masterSitesBusinessPublishRequestSchema = z.object({
  ...commandFields,
  confirmation: z.literal("PUBLISH_SELECTED_BUSINESS_TEMPLATE"),
  updateExisting: z.boolean().default(false)
}).strict();
export type MasterSitesBusinessPublishRequest = z.infer<typeof masterSitesBusinessPublishRequestSchema>;

export const masterSitesBusinessCommandResultSchema = z.object({
  operationId: z.string().uuid(),
  activationLeadId: z.string().uuid(),
  siteId: nullableSiteIdSchema,
  publicHost: nullablePublicHostSchema,
  outcome: masterSitesBusinessOutcomeSchema,
  job: masterSitesSafeJobSchema.nullable(),
  blockedReasons: blockedReasonsSchema
}).strict();
export type MasterSitesBusinessCommandResult = z.infer<typeof masterSitesBusinessCommandResultSchema>;

export const masterSitesErrorResponseSchema = z.object({
  error: safeCodeSchema,
  blockedReasons: blockedReasonsSchema.optional()
}).strict();
export type MasterSitesErrorResponse = z.infer<typeof masterSitesErrorResponseSchema>;
