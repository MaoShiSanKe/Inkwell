import type { ThemeFrameworkSettings } from "@/lib/settings-config";
import {
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

export function SiteFooter({ settings }: { settings: ThemeFrameworkSettings }) {
  if (!settings.public_footer_blurb && !settings.public_footer_copyright) {
    return null;
  }

  const widthClass = resolveContentWidthClass(settings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(settings.public_surface_variant);

  return (
    <footer className={`mx-auto mt-10 w-full ${widthClass} px-6 pb-10`}>
      <div className={`rounded-2xl border px-5 py-4 ${surfaceClass}`}>
        <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
          {settings.public_footer_blurb ? <p>{settings.public_footer_blurb}</p> : null}
          {settings.public_footer_copyright ? (
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {settings.public_footer_copyright}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
