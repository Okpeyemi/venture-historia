"use client";

import { useId, type ReactNode } from "react";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  idPrefix,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  idPrefix?: string;
}) {
  const auto = useId();
  const prefix = idPrefix ?? auto;
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            id={`${prefix}-tab-${o.id}`}
            aria-selected={active}
            aria-controls={`${prefix}-panel-${o.id}`}
            tabIndex={active ? 0 : -1}
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

export function TabPanel({
  id,
  tabId,
  children,
}: {
  id: string;
  tabId: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId}>
      {children}
    </div>
  );
}

// Helper for callers: derive matching panel/tab IDs.
export function tabIds(prefix: string, optionId: string) {
  return {
    tabId: `${prefix}-tab-${optionId}`,
    panelId: `${prefix}-panel-${optionId}`,
  };
}
