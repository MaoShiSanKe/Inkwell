import Link from "next/link";
import type { ReactNode } from "react";

type AdminPageProps = {
  children: ReactNode;
  width?: "default" | "wide";
};

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
};

type AdminActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

type AdminBackLinkProps = {
  adminPath: string;
  children?: ReactNode;
};

const actionLinkClassNames = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900",
};

export function AdminPage({ children, width = "default" }: AdminPageProps) {
  const maxWidth = width === "wide" ? "max-w-6xl" : "max-w-4xl";

  return <main className={`mx-auto flex w-full ${maxWidth} flex-1 flex-col gap-6 px-6 py-16`}>{children}</main>;
}

export function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div> : null}
    </div>
  );
}

export function AdminActionLink({ href, children, variant = "primary" }: AdminActionLinkProps) {
  return (
    <Link className={actionLinkClassNames[variant]} href={href}>
      {children}
    </Link>
  );
}

export function AdminBackLink({ adminPath, children = "返回后台" }: AdminBackLinkProps) {
  return (
    <AdminActionLink href={`/${adminPath}`} variant="secondary">
      {children}
    </AdminActionLink>
  );
}
