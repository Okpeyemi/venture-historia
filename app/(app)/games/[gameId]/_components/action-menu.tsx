"use client";

import { useState } from "react";
import { ActionForms } from "./action-forms";
import type { GameState } from "@/lib/game/types";

const CATEGORIES = ["finance", "team", "product", "market", "strategy", "endgame"] as const;
type Category = (typeof CATEGORIES)[number];

const LABELS: Record<Category, string> = {
  finance: "💰 Finance",
  team: "👥 Équipe",
  product: "🚀 Produit",
  market: "📈 Marché",
  strategy: "🤝 Stratégie",
  endgame: "🏁 Sortie",
};

export function ActionMenu({ gameId, state }: { gameId: string; state: GameState }) {
  const [active, setActive] = useState<Category>("finance");
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              active === c
                ? "bg-neutral-100 text-neutral-900"
                : "border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {LABELS[c]}
          </button>
        ))}
      </div>
      <ActionForms gameId={gameId} state={state} category={active} />
    </div>
  );
}
