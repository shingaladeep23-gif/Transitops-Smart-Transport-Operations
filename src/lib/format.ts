export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function statusLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

// Traffic-light color coding per status value
export const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  ON_TRIP: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  IN_SHOP: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  RETIRED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  OFF_DUTY: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  DRAFT: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300",
  DISPATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  CLOSED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export const ROLE_LABELS: Record<string, string> = {
  FLEET_MANAGER: "Fleet Manager",
  DRIVER: "Dispatcher / Driver",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};
