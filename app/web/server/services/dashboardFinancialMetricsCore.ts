import { z } from "zod";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore";

const paymentCategories = ["ACTIVATION", "MONTHLY_FEE", "ANNUAL_RENEWAL", "ADD_ON", "OTHER"] as const;

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dashboardMetricsPeriodSchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional()
}).superRefine((value, context) => {
  for (const key of ["from", "to"] as const) {
    if (value[key] && !isValidLocalDate(value[key])) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must be a valid calendar date` });
    }
  }
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "to must be on or after from" });
  }
});

export type DashboardMetricsPeriodInput = z.infer<typeof dashboardMetricsPeriodSchema>;

type PartnerRegistration = { createdAt: string };

function isValidLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function localBogotaDate(isoTimestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoTimestamp));
}

function shiftLocalDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetweenInclusive(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1;
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10_000) / 100;
}

export function resolveDashboardPeriods(input: DashboardMetricsPeriodInput, now = new Date()) {
  const parsed = dashboardMetricsPeriodSchema.parse(input);
  const today = localBogotaDate(now.toISOString());
  const from = parsed.from ?? `${(parsed.to ?? today).slice(0, 7)}-01`;
  const to = parsed.to ?? today;
  if (from > to) throw new Error("to must be on or after from");
  const durationDays = daysBetweenInclusive(from, to);
  const previousTo = shiftLocalDate(from, -1);
  const previousFrom = shiftLocalDate(previousTo, -(durationDays - 1));
  return {
    current: { from, to },
    previous: { from: previousFrom, to: previousTo }
  };
}

export function buildDashboardFinancialMetrics(
  payments: ManualPaymentRecord[],
  partners: PartnerRegistration[],
  input: DashboardMetricsPeriodInput,
  now = new Date()
) {
  const periods = resolveDashboardPeriods(input, now);
  const confirmed = payments.filter((payment) => payment.status === "CONFIRMED");
  const inPeriod = (timestamp: string, period: { from: string; to: string }) => {
    const date = localBogotaDate(timestamp);
    return date >= period.from && date <= period.to;
  };
  const currentPayments = confirmed.filter((payment) => inPeriod(payment.paidAt, periods.current));
  const previousPayments = confirmed.filter((payment) => inPeriod(payment.paidAt, periods.previous));
  const sum = (records: ManualPaymentRecord[]) => records.reduce((total, payment) => total + payment.amountCop, 0);
  const currentRevenueCop = sum(currentPayments);
  const previousRevenueCop = sum(previousPayments);
  const currentPartnerRegistrations = partners.filter((partner) => inPeriod(partner.createdAt, periods.current)).length;
  const previousPartnerRegistrations = partners.filter((partner) => inPeriod(partner.createdAt, periods.previous)).length;

  return {
    timezone: "America/Bogota",
    currency: "COP",
    period: periods.current,
    previousPeriod: periods.previous,
    revenueCop: {
      current: currentRevenueCop,
      previous: previousRevenueCop,
      changePercent: percentageChange(currentRevenueCop, previousRevenueCop)
    },
    confirmedPayments: {
      current: currentPayments.length,
      previous: previousPayments.length,
      changePercent: percentageChange(currentPayments.length, previousPayments.length)
    },
    partnerRegistrations: {
      current: currentPartnerRegistrations,
      previous: previousPartnerRegistrations,
      changePercent: percentageChange(currentPartnerRegistrations, previousPartnerRegistrations)
    },
    byCategory: paymentCategories.map((category) => {
      const current = currentPayments.filter((payment) => payment.category === category);
      const previous = previousPayments.filter((payment) => payment.category === category);
      return {
        category,
        currentAmountCop: sum(current),
        previousAmountCop: sum(previous),
        currentPaymentCount: current.length,
        previousPaymentCount: previous.length
      };
    })
  };
}
