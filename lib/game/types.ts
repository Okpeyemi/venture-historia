// lib/game/types.ts

// ─── Scenario / world ────────────────────────────────────────

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type ScenarioRef = {
  presetId: string;
  era: number;
  region: string;
  sector: string;
  startingYear: number;
  currentQuarter: Quarter;
  currentYear: number;
};

export type Competitor = {
  id: string;
  name: string;
  scriptedPersona: string;
  scriptedState: { valuation: number; teamSize: number };
};

export type WorldState = {
  marketConditions: string;
  macroEventsActive: string[];
  competitors: Competitor[];
};

// ─── Player ──────────────────────────────────────────────────

export type ProductStage = "idea" | "rd" | "mvp" | "shipped" | "killed";

export type Product = {
  name: string;
  stage: ProductStage;
  satisfaction: number; // 0-100
  quartersInRD: number;
};

export type Investor = {
  name: string;
  amount: number;
  equityPct: number;
  boardSeats: number;
  hasVeto: boolean;
};

export type PlayerState = {
  companyName: string;
  cash: number;            // USD
  teamSize: number;
  mrr: number;             // monthly recurring revenue, USD
  reputation: number;      // 0-100
  runwayMonths: number;    // computed at trimester close
  founderBurnout: number;  // 0-100 — 100 triggers fail ending
  products: Product[];
  investors: Investor[];
  boardSeatsTaken: number;
};

// ─── History ─────────────────────────────────────────────────

export type KeyDecision = {
  trimesterIndex: number;
  summary: string;
};

export type Consequence = {
  description: string;
  remainingQuarters: number;
};

export type GameHistory = {
  trimestersPlayed: number;
  narrativeSummary: string;
  keyDecisions: KeyDecision[];
  activeConsequences: Consequence[];
};

// ─── Top-level game state (the JSONB blob) ───────────────────

export type GameState = {
  scenario: ScenarioRef;
  worldState: WorldState;
  playerState: PlayerState;
  history: GameHistory;
};

// ─── Actions (discriminated union) ───────────────────────────

export type Action =
  // Finance
  | { kind: "finance.raiseFunds"; round: "seed" | "A" | "B" | "C"; amount: number; equityPct: number; investorName: string; boardSeats: number; hasVeto: boolean }
  | { kind: "finance.allocateBudget"; category: "marketing" | "rd" | "ops"; amount: number }
  // Équipe
  | { kind: "team.hire"; level: "junior" | "senior" | "exec"; salaryAnnual: number }
  | { kind: "team.fire"; count: number }
  // Produit
  | { kind: "product.startRD"; productName: string; quartersUntilLaunch: number }
  | { kind: "product.launch"; productName: string }
  // Marché
  | { kind: "market.campaign"; budget: number }
  | { kind: "market.adjustPricing"; deltaPct: number }
  // Stratégie
  | { kind: "strategy.partnership"; partnerName: string; revShare: number }
  | { kind: "strategy.tryAcquire"; competitorId: string; offerAmount: number }
  // Player-initiated endings
  | { kind: "endgame.declareIPO" }
  | { kind: "endgame.acceptAcquisition"; acquirerName: string; price: number }
  | { kind: "endgame.declareLifestyle" }
  | { kind: "endgame.declareConglomerate" };

// ─── Events (IA-generated mid-trimester) ─────────────────────

export type EventChoice = {
  id: string;
  label: string;
};

export type TrimesterEvent = {
  id: string;
  situation: string;
  choices: EventChoice[];
};

// A decision is what the player picked during the trimester.
export type Decision =
  | { kind: "action"; action: Action }
  | { kind: "eventChoice"; eventId: string; choiceId: string };

// ─── Endings ─────────────────────────────────────────────────

export type EndingKind =
  | "ipo"
  | "acquisition"
  | "lifestyle"
  | "conglomerate"
  | "bankruptcy"
  | "ousting"
  | "burnout"
  | "industry_collapse";

export type Ending = {
  kind: EndingKind;
  trimesterIndex: number;
  summary: string;
};

// ─── Errors ──────────────────────────────────────────────────

export class InvalidActionError extends Error {
  constructor(public readonly action: Action, message: string) {
    super(message);
    this.name = "InvalidActionError";
  }
}
