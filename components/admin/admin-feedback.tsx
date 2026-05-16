import type { ReactNode } from "react";

type AdminNoticeTone = "success" | "warning" | "error" | "info";

type AdminNoticeProps = {
  tone: AdminNoticeTone;
  children: ReactNode;
};

const noticeToneClassNames: Record<AdminNoticeTone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  info:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200",
};

export function AdminNotice({ tone, children }: AdminNoticeProps) {
  const isError = tone === "error";

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-lg border px-4 py-3 text-sm ${noticeToneClassNames[tone]}`}
      role={isError ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
