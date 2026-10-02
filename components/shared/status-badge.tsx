import React from "react";

type BadgeVariant =
  | "active"
  | "pending"
  | "suspended"
  | "deactivated"
  | "approved"
  | "rejected"
  | "closed"
  | "available"
  | "offline"
  | "busy"
  | "draft"
  | "inactive"
  | "archived"
  | "delivered"
  | "paid"
  | "failed"
  | "processing"
  | "default";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  available:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  delivered:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  busy: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
  suspended: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  deactivated: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  closed: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  offline: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
  inactive: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
  archived: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
  default: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
};

function toVariant(val: string): BadgeVariant {
  const lower = val.toLowerCase();
  if (lower in variantStyles) return lower as BadgeVariant;
  return "default";
}

interface StatusBadgeProps {
  value?: string;
  status?: string;
  className?: string;
}

export function StatusBadge({ value, status, className }: StatusBadgeProps) {
  const displayVal = status ?? value ?? "UNKNOWN";
  const variant = toVariant(displayVal);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${variantStyles[variant]} ${className ?? ""}`}
    >
      {displayVal}
    </span>
  );
}
