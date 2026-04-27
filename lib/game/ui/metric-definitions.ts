import type { GameState } from "@/lib/game/types";

export type Tone = "neutral" | "warn" | "crit" | "good";

export type MetricId =
  | "cash"
  | "mrr"
  | "team"
  | "runway"
  | "burnout"
  | "boardTension"
  | "reputation";

export type MetricDef = {
  id: MetricId;
  label: string;
  tooltip: string;
  read: (s: GameState) => string;
  tone: (s: GameState) => Tone;
};

const fmtMoney = (v: number) => `$${v.toLocaleString("en-US")}`;

export const METRICS: MetricDef[] = [
  {
    id: "cash",
    label: "Cash",
    tooltip:
      "Argent en banque. Diminue chaque trimestre du burn (équipe × 10k + 5k overhead). Si à 0 → faillite.",
    read: (s) => fmtMoney(s.playerState.cash),
    tone: (s) => (s.playerState.cash < 0 ? "crit" : "neutral"),
  },
  {
    id: "mrr",
    label: "MRR",
    tooltip: "Revenu mensuel récurrent. Provient des produits lancés × utilisateurs × ARPU.",
    read: (s) => fmtMoney(s.playerState.mrr),
    tone: () => "neutral",
  },
  {
    id: "team",
    label: "Équipe",
    tooltip: "Nombre de personnes. Chaque membre coûte ~10k$/trim et augmente la capacité d'exécution.",
    read: (s) => String(s.playerState.teamSize),
    tone: () => "neutral",
  },
  {
    id: "runway",
    label: "Piste",
    tooltip: "Mois restants avant faillite à burn constant. ≤ 3 = critique, < 6 = court.",
    read: (s) => `${s.playerState.runwayMonths} mois`,
    tone: (s) => {
      const r = s.playerState.runwayMonths;
      if (r <= 3) return "crit";
      if (r < 6) return "warn";
      return "neutral";
    },
  },
  {
    id: "burnout",
    label: "🔥 Burnout",
    tooltip:
      "Épuisement du fondateur (0-100). > 75 = décisions risquées plus dangereuses. > 90 = ousting risk.",
    read: (s) => String(s.playerState.founderBurnout),
    tone: (s) => {
      const b = s.playerState.founderBurnout;
      if (b > 90) return "crit";
      if (b > 75) return "warn";
      return "neutral";
    },
  },
  {
    id: "boardTension",
    label: "🪑 Tension",
    tooltip: "Tension avec le board (0-100). > 70 = risque de putsch lors d'événements.",
    read: (s) => String(s.playerState.boardTension),
    tone: (s) => {
      const t = s.playerState.boardTension;
      if (t > 80) return "crit";
      if (t > 70) return "warn";
      return "neutral";
    },
  },
  {
    id: "reputation",
    label: "Réputation",
    tooltip: "Notoriété marché (0-100). Influence le succès des levées de fonds et acquisitions.",
    read: (s) => String(s.playerState.reputation),
    tone: () => "neutral",
  },
];
