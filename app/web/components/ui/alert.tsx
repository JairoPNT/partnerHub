import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  icon?: ReactNode;
}

export function Alert({
  children,
  className,
  variant = "info",
  title,
  icon,
  ...props
}: AlertProps) {
  const variants = {
    info: "border-blue-100 bg-blue-50/50 text-blue-800",
    success: "border-emerald-100 bg-emerald-50/50 text-emerald-800",
    warning: "border-amber-100 bg-amber-50/50 text-amber-800",
    error: "border-rose-100 bg-rose-50/50 text-rose-800"
  };

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-sm leading-6 transition-all duration-200",
        variants[variant],
        className
      )}
      role="alert"
      {...props}
    >
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="flex-1">
        {title && <h5 className="font-semibold tracking-tight mb-1">{title}</h5>}
        <div className="text-stone-600 text-xs leading-5">{children}</div>
      </div>
    </div>
  );
}
