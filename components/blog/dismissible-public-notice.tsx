"use client";

import { useEffect, useState } from "react";

import type { PublicNoticeSettings } from "@/lib/settings-config";

import { PublicNotice } from "./public-notice";

const DISMISSED_NOTICE_VERSION_KEY = "inkwell-public-notice-dismissed-version";

type DismissiblePublicNoticeProps = {
  settings: PublicNoticeSettings;
};

function isNoticeInActiveWindow(settings: PublicNoticeSettings, now = Date.now()) {
  if (!settings.public_notice_start_at && !settings.public_notice_end_at) {
    return true;
  }

  if (settings.public_notice_start_at) {
    const startAt = new Date(settings.public_notice_start_at).getTime();

    if (Number.isNaN(startAt) || now < startAt) {
      return false;
    }
  }

  if (settings.public_notice_end_at) {
    const endAt = new Date(settings.public_notice_end_at).getTime();

    if (Number.isNaN(endAt) || now >= endAt) {
      return false;
    }
  }

  return true;
}

function shouldRenderNotice(
  settings: PublicNoticeSettings,
  dismissedVersion: string | null,
  now = Date.now(),
) {
  if (!settings.public_notice_enabled || !settings.public_notice_body) {
    return false;
  }

  if (!isNoticeInActiveWindow(settings, now)) {
    return false;
  }

  if (!settings.public_notice_dismissible) {
    return true;
  }

  if (!settings.public_notice_version) {
    return true;
  }

  return dismissedVersion !== settings.public_notice_version;
}

export function DismissiblePublicNotice({ settings }: DismissiblePublicNoticeProps) {
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissedVersion(window.localStorage.getItem(DISMISSED_NOTICE_VERSION_KEY));
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return shouldRenderNotice(settings, null) ? <PublicNotice settings={settings} /> : null;
  }

  if (!shouldRenderNotice(settings, dismissedVersion)) {
    return null;
  }

  return (
    <PublicNotice
      settings={settings}
      dismissButton={
        settings.public_notice_dismissible ? (
          <button
            type="button"
            aria-label="关闭站点公告"
            className="inline-flex items-center justify-center rounded-lg border border-current/20 px-3 py-2 text-sm font-medium text-current transition hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 dark:hover:bg-white/5"
            onClick={() => {
              if (settings.public_notice_version) {
                window.localStorage.setItem(
                  DISMISSED_NOTICE_VERSION_KEY,
                  settings.public_notice_version,
                );
                setDismissedVersion(settings.public_notice_version);
                return;
              }

              setDismissedVersion("__dismissed__");
            }}
          >
            关闭
          </button>
        ) : null
      }
    />
  );
}

export { isNoticeInActiveWindow, shouldRenderNotice };
