import Link from "next/link";

import type { ThemeFrameworkSettings } from "@/lib/settings-config";
import {
  resolveAccentClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

export function SiteHeader({ settings }: { settings: ThemeFrameworkSettings }) {
  const widthClass = resolveContentWidthClass(settings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(settings.public_surface_variant);
  const accentClass = resolveAccentClass(settings.public_accent_theme);

  return (
    <header className={`mx-auto w-full ${widthClass} px-6 pt-6`}>
      <div className={`rounded-2xl border px-5 py-4 ${surfaceClass}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}
            >
              {settings.site_brand_name}
            </Link>
            {settings.public_header_show_tagline && settings.site_tagline ? (
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {settings.site_tagline}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
