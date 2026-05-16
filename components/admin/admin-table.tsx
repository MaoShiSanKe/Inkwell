import type { ReactNode } from "react";

type AdminEmptyStateProps = {
  title: string;
  description: ReactNode;
  action?: ReactNode;
};

type AdminTableContainerProps = {
  children: ReactNode;
};

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 text-sm">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminTableContainer({ children }: AdminTableContainerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
