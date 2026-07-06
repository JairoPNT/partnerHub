import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "neutral";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-200";

  const variants = {
    primary: "bg-sand-100 text-sand-800 border border-sand-200/50",
    secondary: "bg-stone-100 text-stone-800 border border-stone-200/50",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/40",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/40",
    error: "bg-rose-50 text-rose-700 border border-rose-200/40",
    neutral: "bg-stone-50 text-stone-500 border border-stone-200/30"
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
