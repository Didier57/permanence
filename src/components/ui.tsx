import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-on-brand hover:bg-sky-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-red-600 text-on-brand hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button {...props} className={cn(BUTTON_BASE, BUTTON_STYLES[variant], className)} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a {...props} className={cn(BUTTON_BASE, BUTTON_STYLES[variant], className)} />;
}

const FIELD_BASE =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_BASE, className)} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD_BASE, className)} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_BASE, className)} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className={cn("text-sm font-medium text-slate-700", className)} />
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    error: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  } as const;
  return (
    <p role="alert" className={cn("rounded-md px-3 py-2 text-sm", tones[tone])}>
      {children}
    </p>
  );
}
