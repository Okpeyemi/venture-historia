"use client";

import { Tooltip } from "./tooltip";
import type { Tone } from "@/lib/game/ui/metric-definitions";

const toneClasses: Record<Tone, string> = {
  neutral: "text-text-primary",
  warn:    "text-warn",
  crit:    "text-crit",
  good:    "text-success",
};

export function MetricCell({
  id,
  label,
  value,
  tone,
  tooltip,
}: {
  id: string;
  label: string;
  value: string;
  tone: Tone;
  tooltip: string;
}) {
  return (
    <div data-metric-id={id} className="flex flex-col gap-0.5 min-w-[58px]">
      <Tooltip content={tooltip}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-faint">
          {label} <span aria-hidden="true">ⓘ</span>
        </span>
      </Tooltip>
      <span className={`text-sm font-semibold tabular-nums ${toneClasses[tone]}`}>
        {value}
      </span>
    </div>
  );
}
