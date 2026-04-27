import type { Decision } from "@/lib/game/types";

export function DecisionList({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
        Aucune décision pour ce trimestre. Ajoute-en avec le menu d'actions ci-dessous.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-2 text-sm uppercase text-neutral-500">
        Décisions du trimestre ({decisions.length})
      </h2>
      <ul className="space-y-1 text-sm">
        {decisions.map((d, i) => (
          <li key={i} className="font-mono text-neutral-300">
            {d.kind === "action"
              ? `→ ${d.action.kind}`
              : `→ event:${d.eventId} = ${d.choiceId}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
