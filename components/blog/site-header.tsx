import Link from "next/link";

import type { ThemeFrameworkSettings } from "@/lib/settings-config";
import {
  resolveAccentLinkClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

type SiteHeaderNavigationItem = {
  id: number;
  label: string;
  url: string;
  openInNewTab: boolean;
};

export function SiteHeader({
  settings,
  navigationItems = [],
}: {
  settings: ThemeFrameworkSettings;
  navigationItems?: SiteHeaderNavigationItem[];
}) {
  const widthClass = resolveContentWidthClass(settings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(settings.public_surface_variant);
  const accentLinkClass = resolveAccentLinkClass(settings.public_accent_theme);

  return (
    <header className={`mx-auto w-full ${widthClass} px-6 pt-6`}>
      <div className={`rounded-2xl border px-5 py-4 ${surfaceClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className={`text-sm uppercase tracking-[0.2em] ${accentLinkClass}`}
            >
              {settings.site_brand_name}
            </Link>
            {settings.public_header_show_tagline && settings.site_tagline ? (
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {settings.site_tagline}
              </p>
            ) : null}
          </div>

          {navigationItems.length > 0 ? (
            <nav aria-label="站点导航" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className={`text-sm ${accentLinkClass}`}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noreferrer noopener" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
