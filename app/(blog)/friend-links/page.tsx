import type { Metadata } from "next";

import { listPublicFriendLinks, getFriendLinksPageMetadata } from "@/lib/blog/friend-links";
import { getThemeFrameworkSettings } from "@/lib/settings";
import {
  resolveAccentClass,
  resolveContentWidthClass,
  resolveSurfaceClass,
} from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getFriendLinksPageMetadata();

  return {
    title: metadata.title,
    description: metadata.description,
    alternates: {
      canonical: metadata.canonicalUrl,
    },
    openGraph: {
      type: "website",
      title: metadata.title,
      description: metadata.description,
      url: metadata.canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: metadata.title,
      description: metadata.description,
    },
  };
}

export default async function FriendLinksPage() {
  const [friendLinks, themeFrameworkSettings] = await Promise.all([
    listPublicFriendLinks(),
    getThemeFrameworkSettings(),
  ]);
  const widthClass = resolveContentWidthClass(themeFrameworkSettings.public_layout_width);
  const surfaceClass = resolveSurfaceClass(themeFrameworkSettings.public_surface_variant);
  const accentClass = resolveAccentClass(themeFrameworkSettings.public_accent_theme);

  return (
    <main className={`mx-auto flex w-full ${widthClass} flex-1 flex-col gap-8 px-6 py-16`}>
      <div className="flex flex-col gap-3">
        <p className={`text-sm uppercase tracking-[0.2em] ${accentClass}`}>Links</p>
        <h1 className="text-3xl font-semibold tracking-tight">友情链接</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          这里收录了一些值得关注的站点与作者项目。
        </p>
      </div>

      {friendLinks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <p className="text-lg font-medium">暂时还没有公开友链</p>
          <p className="mt-2 text-sm">后续发布的友链会展示在这里。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {friendLinks.map((friendLink) => (
            <a
              key={friendLink.id}
              className={`flex h-full flex-col gap-4 rounded-2xl border p-6 transition hover:-translate-y-0.5 hover:shadow-sm ${surfaceClass}`}
              href={friendLink.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center gap-4">
                {friendLink.logoUrl ? (
                  <img
                    alt={friendLink.logo?.altText || `${friendLink.siteName} logo`}
                    className="h-14 w-14 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                    src={friendLink.logoUrl}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    LINK
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{friendLink.siteName}</h2>
                  <p className={`truncate text-sm ${accentClass}`}>{friendLink.url}</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{friendLink.description || "暂无描述。"}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
