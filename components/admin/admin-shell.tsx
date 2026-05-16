import Link from "next/link";
import type { ReactNode } from "react";

import { adminNavigationItems } from "@/components/admin/admin-navigation";

type AdminShellProps = {
  adminPath: string;
  children: ReactNode;
};

const sectionLabels = {
  content: "内容",
  taxonomy: "组织",
  engagement: "互动",
  system: "系统",
};

export function AdminShell({ adminPath, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link className="text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100" href={`/${adminPath}`}>
              后台首页
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              当前路径：<code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{adminPath}</code>
            </p>
          </div>

          <nav aria-label="后台导航" className="grid gap-3 text-sm md:grid-cols-4">
            {(Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>).map((section) => {
              const items = adminNavigationItems.filter((item) => item.section === section);

              return (
                <div key={section} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {sectionLabels[section]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <Link
                        key={item.key}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
                        href={item.href(adminPath)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
