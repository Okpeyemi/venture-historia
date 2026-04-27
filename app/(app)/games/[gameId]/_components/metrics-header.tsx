import type { GameState } from "@/lib/game/types";

export function MetricsHeader({ state }: { state: GameState }) {
  const ps = state.playerState;
  const sc = state.scenario;
  const metric = (label: string, value: string) => (
    <div className="flex flex-col">
      <span className="text-xs uppercase text-neutral-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{ps.companyName}</h1>
        <span className="text-neutral-400">
          {sc.currentQuarter} {sc.currentYear}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 md:grid-cols-7">
        {metric("Cash", `$${ps.cash.toLocaleString()}`)}
        {metric("Équipe", ps.teamSize.toString())}
        {metric("MRR", `$${ps.mrr.toLocaleString()}`)}
        {metric("Réputation", `${ps.reputation}/100`)}
        {metric("Piste", `${ps.runwayMonths} mois`)}
        {metric("🔥 Burnout", `${ps.founderBurnout}/100`)}
        {metric("🪑 Tension", `${ps.boardTension}/100`)}
      </div>
    </div>
  );
}
