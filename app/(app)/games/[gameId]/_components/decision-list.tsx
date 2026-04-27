import { Panel } from "@/components/ui/panel";
import type { Decision } from "@/lib/game/types";

function describeAction(d: Decision): string {
  if (d.kind === "eventChoice") return `event:${d.eventId} = ${d.choiceId}`;
  const a = d.action;
  switch (a.kind) {
    case "finance.raiseFunds":
      return `finance.raiseFunds · ${a.round} · $${a.amount.toLocaleString("en-US")} · ${a.equityPct}% · ${a.investorName}`;
    case "finance.allocateBudget":
      return `finance.allocateBudget · ${a.category} · $${a.amount.toLocaleString("en-US")}`;
    case "team.hire":
      return `team.hire · ${a.level} · $${a.salaryAnnual.toLocaleString("en-US")}/an`;
    case "team.fire":
      return `team.fire · ${a.count}`;
    case "product.startRD":
      return `product.startRD · ${a.productName} · ${a.quartersUntilLaunch} trim.`;
    case "product.launch":
      return `product.launch · ${a.productName}`;
    case "market.campaign":
      return `market.campaign · $${a.budget.toLocaleString("en-US")}`;
    case "market.adjustPricing":
      return `market.adjustPricing · ${a.deltaPct}%`;
    case "strategy.partnership":
      return `strategy.partnership · ${a.partnerName} · ${a.revShare}%`;
    case "strategy.tryAcquire":
      return `strategy.tryAcquire · ${a.competitorId} · $${a.offerAmount.toLocaleString("en-US")}`;
    default:
      return a.kind;
  }
}

export function DecisionList({ decisions }: { decisions: Decision[] }) {
  return (
    <Panel
      title="Décisions du trimestre"
      badge={String(decisions.length)}
      variant="default"
    >
      {decisions.length === 0 ? (
        <p className="text-[12px] text-text-muted" data-tutorial-target="decisions">
          Aucune décision encore. Ajoute-en avec les onglets à droite.
        </p>
      ) : (
        <ul
          data-tutorial-target="decisions"
          className="flex flex-col gap-1 font-mono text-[11px] leading-[1.5]"
        >
          {decisions.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-text-muted">
              <span className="text-info" aria-hidden>→</span>
              <span>{describeAction(d)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
