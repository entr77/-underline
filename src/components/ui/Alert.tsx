import type { ReactNode } from "react";

type AlertVariant = "error" | "warning" | "info" | "success";

type Props = {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
};

const CONFIG: Record<AlertVariant, { container: string; icon: ReactNode }> = {
  error: {
    container: "bg-red-50 border-red-200 text-red-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" flexShrink-0="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    container: "bg-[var(--color-cream-dark)] border-[var(--color-border)] text-[var(--color-ink-muted)]",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
};

export default function Alert({ variant = "info", title, children }: Props) {
  const { container, icon } = CONFIG[variant];

  return (
    <div className={`flex gap-3 px-4 py-3 rounded-xl border text-sm ${container}`} role="alert">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <p className="leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
