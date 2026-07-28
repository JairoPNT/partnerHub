import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "neutral";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-200";

  const variants = {
    primary: "bg-cyan-50 text-cyan-900 border border-cyan-200/60",
    secondary: "bg-slate-100 text-slate-800 border border-slate-200/60",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    warning: "bg-amber-50 text-amber-800 border border-amber-200/50",
    error: "bg-rose-50 text-rose-700 border border-rose-200/50",
    neutral: "bg-slate-50 text-slate-500 border border-slate-200/40"
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
