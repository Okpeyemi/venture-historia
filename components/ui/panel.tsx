import type { ReactNode } from "react";

type Variant = "default" | "narration" | "hint" | "advisor" | "alert";

const variantClasses: Record<Variant, string> = {
  default:   "bg-panel border-border-subtle",
  narration: "bg-panel border-border-subtle border-l-[3px] border-l-info",
  hint:      "bg-[rgba(99,102,241,0.06)] border-[#3730a3] border-l-[3px] border-l-help",
  advisor:   "bg-[rgba(139,92,246,0.05)] border-[#4c1d95]",
  alert:     "bg-[rgba(245,158,11,0.08)] border-event border-l-[3px] border-l-event",
};

export function Panel({
  title,
  badge,
  variant = "default",
  className = "",
  children,
}: {
  title?: string;
  badge?: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-md border p-3 ${variantClasses[variant]} ${className}`}>
      {(title || badge) && (
        <header className="mb-2 flex items-center justify-between">
          {title && (
            <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
              {title}
            </h2>
          )}
          {badge && (
            <span className="rounded-full bg-panel-elev px-2 py-0.5 text-[10px] tracking-wider text-text-muted">
              {badge}
            </span>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
