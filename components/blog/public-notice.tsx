import Link from "next/link";

import type { PublicNoticeSettings } from "@/lib/settings-config";

type PublicNoticeProps = {
  settings: PublicNoticeSettings;
  dismissButton?: React.ReactNode;
};

const NOTICE_VARIANT_STYLES: Record<PublicNoticeSettings["public_notice_variant"], string> = {
  info: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
};

export function PublicNotice({ settings, dismissButton = null }: PublicNoticeProps) {
  if (!settings.public_notice_enabled || !settings.public_notice_body) {
    return null;
  }

  const hasLink = Boolean(settings.public_notice_link_label && settings.public_notice_link_url);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pt-4" aria-label="站点公告">
      <div
        className={`rounded-2xl border px-5 py-4 ${NOTICE_VARIANT_STYLES[settings.public_notice_variant]}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            {settings.public_notice_title ? (
              <h2 className="text-base font-semibold tracking-tight text-current">
                {settings.public_notice_title}
              </h2>
            ) : null}
            <p className="text-sm leading-6 text-current/90">{settings.public_notice_body}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {hasLink ? (
              <Link
                href={settings.public_notice_link_url}
                className="inline-flex items-center justify-center rounded-lg border border-current/20 px-3 py-2 text-sm font-medium text-current transition hover:bg-white/40 dark:hover:bg-white/5"
              >
                {settings.public_notice_link_label}
              </Link>
            ) : null}
            {dismissButton}
          </div>
        </div>
      </div>
    </section>
  );
}
