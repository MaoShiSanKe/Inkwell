import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type AdminFormShellProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
};

type AdminFieldProps = {
  label: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
};

type AdminTextInputProps = InputHTMLAttributes<HTMLInputElement>;
type AdminTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const fieldClassName = "flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200";
const controlClassName = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const errorClassName = "text-sm text-red-600 dark:text-red-300";
const helperClassName = "text-xs font-normal text-slate-500 dark:text-slate-400";

export function AdminFormShell({ action, children }: AdminFormShellProps) {
  return (
    <form action={action} className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
      {children}
    </form>
  );
}

export function AdminField({ label, children, error, helperText }: AdminFieldProps) {
  return (
    <label className={fieldClassName}>
      {label}
      {children}
      {helperText ? <span className={helperClassName}>{helperText}</span> : null}
      {error ? <span className={errorClassName}>{error}</span> : null}
    </label>
  );
}

export function AdminTextInput({ className = "", ...props }: AdminTextInputProps) {
  return <input className={`${controlClassName} ${className}`.trim()} {...props} />;
}

export function AdminTextArea({ className = "", ...props }: AdminTextAreaProps) {
  return <textarea className={`${controlClassName} min-h-32 ${className}`.trim()} {...props} />;
}

export function AdminSelect({ className = "", ...props }: AdminSelectProps) {
  return <select className={`${controlClassName} ${className}`.trim()} {...props} />;
}

export const adminSubmitButtonClassName = "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";
