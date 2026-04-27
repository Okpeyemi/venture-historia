import { advanceTrimesterAction } from "../../actions";
import { MetricCell } from "@/components/ui/metric-cell";
import { METRICS } from "@/lib/game/ui/metric-definitions";
import { AdvanceButton } from "./advance-button";
import type { GameState } from "@/lib/game/types";

export function TopBar({ gameId, state }: { gameId: string; state: GameState }) {
  const ps = state.playerState;
  const sc = state.scenario;
  const trimNumber = state.history.trimestersPlayed + 1;

  return (
    <div
      data-tutorial-target="topbar"
      className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border border-border-subtle bg-panel px-4 py-2.5"
    >
      <div className="flex items-center gap-6 overflow-hidden">
        <div className="flex items-baseline gap-3 whitespace-nowrap">
          <h1 className="text-[16px] font-bold text-text-primary tracking-tight">{ps.companyName}</h1>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">
            {sc.currentQuarter} · {sc.currentYear} · T{trimNumber}
          </span>
        </div>
        <div className="flex items-center gap-4 overflow-hidden">
          {METRICS.map((m) => (
            <div
              key={m.id}
              data-tutorial-target={m.id === "runway" ? "metric-runway" : undefined}
            >
              <MetricCell
                id={m.id}
                label={m.label}
                value={m.read(state)}
                tone={m.tone(state)}
                tooltip={m.tooltip}
              />
            </div>
          ))}
        </div>
      </div>
      <form
        action={async () => {
          "use server";
          await advanceTrimesterAction(gameId);
        }}
      >
        <AdvanceButton />
      </form>
    </div>
  );
}
