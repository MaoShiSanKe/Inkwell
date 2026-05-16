import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  label: string;
  help?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

type SettingsSectionProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
};

type SettingsTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
  name: string;
  label: string;
  help?: ReactNode;
  error?: string;
  fieldClassName?: string;
};

type SettingsTextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> & {
  name: string;
  label: string;
  help?: ReactNode;
  error?: string;
  fieldClassName?: string;
  code?: boolean;
};

type SettingsSelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & {
  name: string;
  label: string;
  help?: ReactNode;
  error?: string;
  fieldClassName?: string;
  options: Array<{
    value: string;
    label: string;
  }>;
};

const fieldInputClassName =
  "rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-slate-500 dark:focus:ring-slate-800/80";

const fieldLabelClassName = "flex flex-col gap-2 text-sm font-medium text-slate-800 dark:text-slate-100";

export function SettingsSection({ title, description, eyebrow, children }: SettingsSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function FieldShell({ label, help, error, className, children }: FieldShellProps) {
  return (
    <label className={`${fieldLabelClassName}${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      {children}
      {help ? (
        <span className="text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
          {help}
        </span>
      ) : null}
      {error ? <span className="text-sm text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  );
}

export function SettingsTextField({
  label,
  help,
  error,
  fieldClassName,
  className,
  ...props
}: SettingsTextFieldProps) {
  return (
    <FieldShell label={label} help={help} error={error} className={fieldClassName}>
      <input className={`${fieldInputClassName}${className ? ` ${className}` : ""}`} {...props} />
    </FieldShell>
  );
}

export function SettingsTextareaField({
  label,
  help,
  error,
  fieldClassName,
  className,
  code = false,
  ...props
}: SettingsTextareaFieldProps) {
  return (
    <FieldShell label={label} help={help} error={error} className={fieldClassName}>
      <textarea
        className={`${fieldInputClassName} ${code ? "font-mono" : "leading-7"}${className ? ` ${className}` : ""}`}
        {...props}
      />
    </FieldShell>
  );
}

export function SettingsSelectField({
  label,
  help,
  error,
  fieldClassName,
  className,
  options,
  ...props
}: SettingsSelectFieldProps) {
  return (
    <FieldShell label={label} help={help} error={error} className={fieldClassName}>
      <select className={`${fieldInputClassName}${className ? ` ${className}` : ""}`} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SettingsNotice({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "red" }) {
  const className =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";

  return <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${className}`}>{children}</p>;
}
