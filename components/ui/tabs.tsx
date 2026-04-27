"use client";

import type { ReactNode } from "react";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border border-info bg-[rgba(59,130,246,0.15)] text-text-primary"
                : "border border-border-subtle bg-transparent text-text-faint hover:text-text-default hover:border-border-default"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div role="tabpanel">{children}</div>;
}
