import type { GameState } from "@/lib/game/types";

export type ContextualHint = { id: string; message: string };

const HINTS: Record<string, string> = {
  "runway-critical": "Faillite imminente. Lève des fonds ou licencie immédiatement.",
  "burnout-high": "Tu cours à l'épuisement. Évite les décisions risquées ce trimestre.",
  "board-hostile": "Le board est à cran — un putsch est possible. Calme le jeu.",
  "runway-short": "Ta piste est courte. Lève des fonds tant que c'est possible.",
  "first-trimester": "Premier trimestre : pose les fondations (équipe, financement, premier produit).",
  "no-product-yet": "Tu n'as encore rien lancé. Sans produit, pas de MRR.",
  "stable": "État stable. Continue d'exécuter ton plan.",
};

export function pickHint(state: GameState): ContextualHint {
  const ps = state.playerState;
  const hist = state.history;

  if (ps.runwayMonths <= 3) return { id: "runway-critical", message: HINTS["runway-critical"]! };
  if (ps.founderBurnout > 75) return { id: "burnout-high", message: HINTS["burnout-high"]! };
  if (ps.boardTension > 70) return { id: "board-hostile", message: HINTS["board-hostile"]! };
  if (ps.runwayMonths < 6) return { id: "runway-short", message: HINTS["runway-short"]! };
  if (hist.trimestersPlayed === 0) return { id: "first-trimester", message: HINTS["first-trimester"]! };
  const anyLaunched = ps.products.some((p) => p.stage === "shipped");
  if (!anyLaunched && hist.trimestersPlayed >= 4) {
    return { id: "no-product-yet", message: HINTS["no-product-yet"]! };
  }
  return { id: "stable", message: HINTS["stable"]! };
}
