import type { PostTocItem } from "@/lib/blog/post-toc";
import type { PublicAccentTheme, PublicSurfaceVariant } from "@/lib/settings-config";
import { resolveAccentLinkClass, resolveSurfaceClass } from "@/lib/theme";

type PostTableOfContentsProps = {
  items: PostTocItem[];
  accentTheme?: PublicAccentTheme;
  surfaceVariant?: PublicSurfaceVariant;
};

export function PostTableOfContents({
  items,
  accentTheme = "slate",
  surfaceVariant = "soft",
}: PostTableOfContentsProps) {
  const accentLinkClass = resolveAccentLinkClass(accentTheme);
  const surfaceClass = resolveSurfaceClass(surfaceVariant);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="文章目录" className={`rounded-2xl border px-6 py-5 ${surfaceClass}`}>
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">文章目录</h2>
        <ol className="flex flex-col gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? "pl-4" : undefined}>
              <a
                className={accentLinkClass}
                href={`#${item.id}`}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
