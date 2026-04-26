# Game Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the deterministic game engine for Venture Historia: types, pure action processors, burnout gauge, end-game detection, IA-boundary interfaces (with mocks), and persistence. After this plan, an integration test can programmatically play a complete game (with stubbed IA narration/events) and observe state transitions, win/lose conditions, and DB persistence.

**Architecture:** Pure-functional core (`lib/game/*`) with a narrow IA boundary that today returns canned mocks (Plan #4 swaps in real Claude). All state lives in TypeScript types and serializes to a `jsonb` column on the `trimester` table — no normalized game-state tables. The engine orchestrator runs the 4-phase trimester loop (opening → planning → event → closing) by composing the action processors with mocked GM narration. Two new tables (`game`, `trimester`) extend the existing Drizzle schema; one new migration applies them.

**Tech Stack:** TypeScript (strict), Drizzle ORM (jsonb columns + composite PKs), Vitest (unit + a separate integration config that talks to the dev Postgres). No new runtime dependencies beyond `crypto.randomUUID()` (Node global).

---

## Scope

**In scope (Game Engine Core):**
- Full TypeScript type model: `GameState`, `WorldState`, `PlayerState`, `Scenario`, `Action`, `Event`, `Decision`, `Ending`, `Competitor`, `Product`, `Investor`
- DB schema extension: `game` (status, ending, current trimester index) + `trimester` (jsonb state, narrations, event, decisions) tables, plus their migration
- Pure action processors for 5 categories (Finance, Équipe, Produit, Marché, Stratégie) — 2 actions per category to prove the dispatch framework
- Burnout gauge calculation
- End-game detection: 2 auto-detected endings (bankruptcy, burnout) + 4 player-initiated endings as discrete actions (IPO, acquisition, lifestyle, conglomerate)
- IA-boundary interfaces: `IGameMaster`, `IValidator`, `IAdvisor`
- Mock implementations of all 3 IA interfaces (used by tests + Plan #4 will swap them out)
- Engine orchestrator: `openTrimester`, `applyDecisions`, `handleEvent`, `closeTrimester`
- Persistence: `createGame`, `loadGame`, `saveTrimester`, `loadTrimester`
- 1 integration test that plays 5 trimesters end-to-end against a real Postgres + asserts state, persistence, and ending detection

**Out of scope (later plans):**
- Real Anthropic SDK integration (Plan #4)
- The SF 2005 SaaS preset content — scripted competitors, milestone reactions, lore (Plan #3)
- The 2 remaining auto-fail endings (ousting via board tension, industry collapse via macro events) — both depend on Plan #3's scripted competitors and macro events
- HTTP API routes that expose the engine (Plan #5 — landing alongside the UI that calls them)
- UI components (Plan #5)
- Autosave loop / save slot UX (Plan #6)
- Credits ledger and IA cost tracking (Plan #7)
- More than 2 actions per category — Plan #3 expands the action library tied to scenario content

---

## File Structure

```
venture-historia/
├── lib/
│   ├── db/
│   │   └── schema.ts                                  # MODIFY — add `games` + `trimesters` tables
│   ├── env.ts                                         # MODIFY — no change needed (DB already validated)
│   └── game/                                          # ALL NEW
│       ├── types.ts                                   # CREATE — all TypeScript types
│       ├── state.ts                                   # CREATE — state factory + accessors
│       ├── burnout.ts                                 # CREATE — burnout calculation
│       ├── actions/
│       │   ├── index.ts                               # CREATE — processAction dispatcher
│       │   ├── finance.ts                             # CREATE — Finance category processors
│       │   ├── team.ts                                # CREATE — Équipe category processors
│       │   ├── product.ts                             # CREATE — Produit category processors
│       │   ├── market.ts                              # CREATE — Marché category processors
│       │   └── strategy.ts                            # CREATE — Stratégie category processors
│       ├── endings.ts                                 # CREATE — auto-detect endings + apply player-initiated
│       ├── engine.ts                                  # CREATE — orchestrator (4-phase loop)
│       ├── persistence.ts                             # CREATE — Drizzle queries for game/trimester
│       └── ia/
│           ├── types.ts                               # CREATE — IGameMaster, IValidator, IAdvisor
│           └── mock.ts                                # CREATE — Mock implementations for tests
│
├── drizzle/                                           # GENERATED — new migration appears here
│
├── tests/
│   ├── unit/
│   │   └── game/                                      # ALL NEW
│   │       ├── state.test.ts
│   │       ├── burnout.test.ts
│   │       ├── actions/
│   │       │   ├── finance.test.ts
│   │       │   ├── team.test.ts
│   │       │   ├── product.test.ts
│   │       │   ├── market.test.ts
│   │       │   └── strategy.test.ts
│   │       ├── endings.test.ts
│   │       └── engine.test.ts
│   └── integration/                                   # ALL NEW
│       ├── setup.ts                                   # CREATE — DB cleanup helper
│       └── game/
│           └── playthrough.test.ts                    # CREATE — 5-trimester end-to-end
│
├── vitest.integration.config.ts                       # CREATE — separate config for integration tests
└── package.json                                       # MODIFY — add test:integration script
```

**File responsibilities:**
- `lib/game/types.ts` — single source of truth for the game type model. Other modules import from here only.
- `lib/game/state.ts` — pure helpers to build, validate, and query a `GameState` (no IA, no DB).
- `lib/game/actions/*` — each file exports `process<Category>(state, action) → state`. Pure. Errors throw `InvalidActionError` with a reason (so the Validator can catch it later).
- `lib/game/actions/index.ts` — top-level `processAction(state, action) → state` that dispatches by `action.kind`.
- `lib/game/endings.ts` — `detectAutoEnding(state) → Ending | null` + `applyPlayerEnding(state, action) → Ending`.
- `lib/game/engine.ts` — orchestrates a trimester: takes IA implementations as dependencies (DI), runs the 4 phases, returns the new state + narrations + decisions. No DB access.
- `lib/game/persistence.ts` — only place that talks to the DB. Translates `GameState` ↔ rows.
- `lib/game/ia/types.ts` — interfaces only. No implementations.
- `lib/game/ia/mock.ts` — deterministic mocks: GameMaster returns canned narrations, Validator accepts everything legal-looking, Advisor returns a stock recommendation.

---

## Tasks

### Task 1: Define the core type model

**Files:**
- Create: `lib/game/types.ts`

- [ ] **Step 1: Create the file with the full type model**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/game/types.ts
git commit -m "feat(engine): core game type model"
```

---

### Task 2: State factory and accessors

**Files:**
- Create: `lib/game/state.ts`, `tests/unit/game/state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createInitialState, computeRunwayMonths, monthlyBurn } from "@/lib/game/state";
import type { ScenarioRef } from "@/lib/game/types";

const scenario: ScenarioRef = {
  presetId: "test_preset",
  era: 2005,
  region: "Test",
  sector: "Test",
  startingYear: 2005,
  currentQuarter: "Q1",
  currentYear: 2005,
};

describe("createInitialState", () => {
  it("seeds a coherent state from scenario + starting params", () => {
    const state = createInitialState({
      scenario,
      companyName: "TestCo",
      startingCash: 50_000,
      startingTeamSize: 1,
    });
    expect(state.playerState.companyName).toBe("TestCo");
    expect(state.playerState.cash).toBe(50_000);
    expect(state.playerState.teamSize).toBe(1);
    expect(state.playerState.mrr).toBe(0);
    expect(state.playerState.reputation).toBe(50);
    expect(state.playerState.founderBurnout).toBe(20);
    expect(state.playerState.products).toEqual([]);
    expect(state.playerState.investors).toEqual([]);
    expect(state.playerState.boardSeatsTaken).toBe(0);
    expect(state.history.trimestersPlayed).toBe(0);
    expect(state.worldState.competitors).toEqual([]);
    expect(state.worldState.macroEventsActive).toEqual([]);
  });
});

describe("monthlyBurn", () => {
  it("is teamSize × $10k + $5k base ops", () => {
    expect(monthlyBurn(0)).toBe(5_000);
    expect(monthlyBurn(1)).toBe(15_000);
    expect(monthlyBurn(5)).toBe(55_000);
  });
});

describe("computeRunwayMonths", () => {
  it("is floor(cash / monthlyBurn)", () => {
    expect(computeRunwayMonths({ cash: 60_000, teamSize: 1 })).toBe(4); // 60k / 15k = 4
    expect(computeRunwayMonths({ cash: 100_000, teamSize: 5 })).toBe(1); // 100k / 55k = 1
    expect(computeRunwayMonths({ cash: 0, teamSize: 5 })).toBe(0);
  });

  it("returns 0 when burn is somehow 0", () => {
    expect(computeRunwayMonths({ cash: 10_000, teamSize: -1 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test — it must fail (no module yet)**

Run: `npm test`
Expected: FAIL, "Failed to resolve import @/lib/game/state".

- [ ] **Step 3: Implement `lib/game/state.ts`**

```ts
import type { GameState, ScenarioRef } from "./types";

export function monthlyBurn(teamSize: number): number {
  if (teamSize < 0) return 0;
  return teamSize * 10_000 + 5_000;
}

export function computeRunwayMonths(args: { cash: number; teamSize: number }): number {
  const burn = monthlyBurn(args.teamSize);
  if (burn <= 0) return 0;
  if (args.cash <= 0) return 0;
  return Math.floor(args.cash / burn);
}

export function createInitialState(args: {
  scenario: ScenarioRef;
  companyName: string;
  startingCash: number;
  startingTeamSize: number;
}): GameState {
  return {
    scenario: args.scenario,
    worldState: {
      marketConditions: "neutral",
      macroEventsActive: [],
      competitors: [],
    },
    playerState: {
      companyName: args.companyName,
      cash: args.startingCash,
      teamSize: args.startingTeamSize,
      mrr: 0,
      reputation: 50,
      runwayMonths: computeRunwayMonths({
        cash: args.startingCash,
        teamSize: args.startingTeamSize,
      }),
      founderBurnout: 20,
      products: [],
      investors: [],
      boardSeatsTaken: 0,
    },
    history: {
      trimestersPlayed: 0,
      narrativeSummary: "",
      keyDecisions: [],
      activeConsequences: [],
    },
  };
}
```

- [ ] **Step 4: Run the test — must pass**

Run: `npm test`
Expected: 4 new tests pass (plus existing env loader tests).

- [ ] **Step 5: Commit**

```bash
git add lib/game/state.ts tests/unit/game/state.test.ts
git commit -m "feat(engine): state factory + runway/burn helpers"
```

---

### Task 3: Burnout calculation

**Files:**
- Create: `lib/game/burnout.ts`, `tests/unit/game/burnout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/burnout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyBurnoutDelta, BURNOUT_DELTAS } from "@/lib/game/burnout";

describe("BURNOUT_DELTAS", () => {
  it("exposes a coherent set of trimester-level deltas", () => {
    expect(BURNOUT_DELTAS.baseline).toBe(3);
    expect(BURNOUT_DELTAS.runwayCritical).toBe(8);
    expect(BURNOUT_DELTAS.firedSomeone).toBe(4);
    expect(BURNOUT_DELTAS.successfulRaise).toBe(-6);
    expect(BURNOUT_DELTAS.shippedProduct).toBe(-4);
  });
});

describe("applyBurnoutDelta", () => {
  it("clamps to [0, 100]", () => {
    expect(applyBurnoutDelta(95, 10)).toBe(100);
    expect(applyBurnoutDelta(5, -10)).toBe(0);
    expect(applyBurnoutDelta(50, 0)).toBe(50);
  });

  it("adds positive deltas", () => {
    expect(applyBurnoutDelta(40, 8)).toBe(48);
  });

  it("subtracts negative deltas", () => {
    expect(applyBurnoutDelta(40, -6)).toBe(34);
  });
});
```

- [ ] **Step 2: Run the test — must fail**

Run: `npm test`
Expected: FAIL, "Failed to resolve import @/lib/game/burnout".

- [ ] **Step 3: Implement `lib/game/burnout.ts`**

```ts
export const BURNOUT_DELTAS = {
  baseline: 3,                 // applied every trimester regardless
  runwayCritical: 8,           // when runwayMonths < 3 at trimester close
  firedSomeone: 4,             // any team.fire action this trimester
  successfulRaise: -6,         // any finance.raiseFunds applied this trimester
  shippedProduct: -4,          // product.launch applied this trimester
} as const;

export function applyBurnoutDelta(current: number, delta: number): number {
  const next = current + delta;
  if (next < 0) return 0;
  if (next > 100) return 100;
  return next;
}
```

- [ ] **Step 4: Run the test — must pass**

Run: `npm test`
Expected: all burnout tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/burnout.ts tests/unit/game/burnout.test.ts
git commit -m "feat(engine): burnout gauge helpers and deltas table"
```

---

### Task 4: Action processor — Finance

**Files:**
- Create: `lib/game/actions/finance.ts`, `tests/unit/game/actions/finance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/actions/finance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { processFinance } from "@/lib/game/actions/finance";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 100_000,
    startingTeamSize: 2,
  });

describe("processFinance — finance.raiseFunds", () => {
  it("adds cash, records investor, and increments boardSeatsTaken", () => {
    const state = baseState();
    const action: Action = {
      kind: "finance.raiseFunds",
      round: "seed",
      amount: 500_000,
      equityPct: 15,
      investorName: "Acme Capital",
      boardSeats: 1,
      hasVeto: false,
    };
    const next = processFinance(state, action);
    expect(next.playerState.cash).toBe(600_000);
    expect(next.playerState.investors).toEqual([
      { name: "Acme Capital", amount: 500_000, equityPct: 15, boardSeats: 1, hasVeto: false },
    ]);
    expect(next.playerState.boardSeatsTaken).toBe(1);
  });

  it("rejects amount <= 0", () => {
    const state = baseState();
    const action: Action = {
      kind: "finance.raiseFunds",
      round: "seed",
      amount: 0,
      equityPct: 15,
      investorName: "X",
      boardSeats: 0,
      hasVeto: false,
    };
    expect(() => processFinance(state, action)).toThrow(InvalidActionError);
  });
});

describe("processFinance — finance.allocateBudget", () => {
  it("debits cash by the allocated amount", () => {
    const state = baseState();
    const action: Action = { kind: "finance.allocateBudget", category: "marketing", amount: 30_000 };
    const next = processFinance(state, action);
    expect(next.playerState.cash).toBe(70_000);
  });

  it("rejects allocation exceeding available cash", () => {
    const state = baseState();
    const action: Action = { kind: "finance.allocateBudget", category: "rd", amount: 1_000_000 };
    expect(() => processFinance(state, action)).toThrow(/insufficient cash/i);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL, "Failed to resolve import @/lib/game/actions/finance".

- [ ] **Step 3: Implement `lib/game/actions/finance.ts`**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processFinance(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "finance.raiseFunds": {
      if (action.amount <= 0) {
        throw new InvalidActionError(action, "Raise amount must be > 0");
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash + action.amount,
          investors: [
            ...state.playerState.investors,
            {
              name: action.investorName,
              amount: action.amount,
              equityPct: action.equityPct,
              boardSeats: action.boardSeats,
              hasVeto: action.hasVeto,
            },
          ],
          boardSeatsTaken: state.playerState.boardSeatsTaken + action.boardSeats,
        },
      };
    }
    case "finance.allocateBudget": {
      if (action.amount > state.playerState.cash) {
        throw new InvalidActionError(action, "insufficient cash for allocation");
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash - action.amount,
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a finance action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all finance tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/actions/finance.ts tests/unit/game/actions/finance.test.ts
git commit -m "feat(engine): finance action processor (raiseFunds + allocateBudget)"
```

---

### Task 5: Action processor — Équipe (team)

**Files:**
- Create: `lib/game/actions/team.ts`, `tests/unit/game/actions/team.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/actions/team.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { processTeam } from "@/lib/game/actions/team";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 200_000,
    startingTeamSize: 5,
  });

describe("processTeam — team.hire", () => {
  it("increments teamSize and immediately debits one quarter of salary", () => {
    const state = baseState();
    const action: Action = { kind: "team.hire", level: "senior", salaryAnnual: 120_000 };
    const next = processTeam(state, action);
    expect(next.playerState.teamSize).toBe(6);
    // 120k annual / 4 = 30k per quarter
    expect(next.playerState.cash).toBe(170_000);
  });

  it("rejects hire when cash < first quarter of salary", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, cash: 10_000 } };
    const action: Action = { kind: "team.hire", level: "senior", salaryAnnual: 120_000 };
    expect(() => processTeam(state, action)).toThrow(/insufficient cash/i);
  });
});

describe("processTeam — team.fire", () => {
  it("decrements teamSize by count", () => {
    const state = baseState();
    const action: Action = { kind: "team.fire", count: 2 };
    const next = processTeam(state, action);
    expect(next.playerState.teamSize).toBe(3);
  });

  it("clamps teamSize to >= 0 and rejects firing more than available", () => {
    const state = baseState();
    const action: Action = { kind: "team.fire", count: 99 };
    expect(() => processTeam(state, action)).toThrow(/cannot fire/i);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/actions/team.ts`**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processTeam(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "team.hire": {
      const firstQuarterCost = Math.floor(action.salaryAnnual / 4);
      if (state.playerState.cash < firstQuarterCost) {
        throw new InvalidActionError(
          action,
          `insufficient cash for hire (need ${firstQuarterCost}, have ${state.playerState.cash})`,
        );
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          teamSize: state.playerState.teamSize + 1,
          cash: state.playerState.cash - firstQuarterCost,
        },
      };
    }
    case "team.fire": {
      if (action.count <= 0) {
        throw new InvalidActionError(action, "fire count must be > 0");
      }
      if (action.count > state.playerState.teamSize) {
        throw new InvalidActionError(
          action,
          `cannot fire ${action.count} when team is ${state.playerState.teamSize}`,
        );
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          teamSize: state.playerState.teamSize - action.count,
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a team action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all team tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/actions/team.ts tests/unit/game/actions/team.test.ts
git commit -m "feat(engine): team action processor (hire + fire)"
```

---

### Task 6: Action processor — Produit (product)

**Files:**
- Create: `lib/game/actions/product.ts`, `tests/unit/game/actions/product.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/actions/product.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { processProduct } from "@/lib/game/actions/product";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 200_000,
    startingTeamSize: 3,
  });

describe("processProduct — product.startRD", () => {
  it("adds a product in R&D stage with the given quartersUntilLaunch", () => {
    const state = baseState();
    const action: Action = { kind: "product.startRD", productName: "Nimbus v1", quartersUntilLaunch: 3 };
    const next = processProduct(state, action);
    expect(next.playerState.products).toEqual([
      { name: "Nimbus v1", stage: "rd", satisfaction: 0, quartersInRD: 3 },
    ]);
  });

  it("rejects starting R&D on a name that already exists", () => {
    const action: Action = { kind: "product.startRD", productName: "X", quartersUntilLaunch: 2 };
    const stateWithProduct = processProduct(baseState(), action);
    expect(() => processProduct(stateWithProduct, action)).toThrow(/already exists/i);
  });
});

describe("processProduct — product.launch", () => {
  it("transitions an existing R&D product to shipped, sets satisfaction to 60", () => {
    const startedRD: Action = { kind: "product.startRD", productName: "Nimbus v1", quartersUntilLaunch: 1 };
    const state = processProduct(baseState(), startedRD);
    const launch: Action = { kind: "product.launch", productName: "Nimbus v1" };
    const next = processProduct(state, launch);
    expect(next.playerState.products[0]).toMatchObject({
      name: "Nimbus v1",
      stage: "shipped",
      satisfaction: 60,
    });
  });

  it("rejects launching a product that doesn't exist", () => {
    const action: Action = { kind: "product.launch", productName: "Ghost" };
    expect(() => processProduct(baseState(), action)).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/actions/product.ts`**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processProduct(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "product.startRD": {
      const exists = state.playerState.products.some((p) => p.name === action.productName);
      if (exists) {
        throw new InvalidActionError(action, `product ${action.productName} already exists`);
      }
      return {
        ...state,
        playerState: {
          ...state.playerState,
          products: [
            ...state.playerState.products,
            {
              name: action.productName,
              stage: "rd",
              satisfaction: 0,
              quartersInRD: action.quartersUntilLaunch,
            },
          ],
        },
      };
    }
    case "product.launch": {
      const idx = state.playerState.products.findIndex((p) => p.name === action.productName);
      if (idx === -1) {
        throw new InvalidActionError(action, `product ${action.productName} not found`);
      }
      const products = state.playerState.products.map((p, i) =>
        i === idx ? { ...p, stage: "shipped" as const, satisfaction: 60 } : p,
      );
      return {
        ...state,
        playerState: { ...state.playerState, products },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a product action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all product tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/actions/product.ts tests/unit/game/actions/product.test.ts
git commit -m "feat(engine): product action processor (startRD + launch)"
```

---

### Task 7: Action processor — Marché (market)

**Files:**
- Create: `lib/game/actions/market.ts`, `tests/unit/game/actions/market.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/actions/market.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { processMarket } from "@/lib/game/actions/market";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState => {
  const s = createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 100_000,
    startingTeamSize: 3,
  });
  return { ...s, playerState: { ...s.playerState, mrr: 10_000, reputation: 60 } };
};

describe("processMarket — market.campaign", () => {
  it("debits cash, raises reputation by floor(budget / 5000), capped at 100", () => {
    const state = baseState();
    const action: Action = { kind: "market.campaign", budget: 25_000 };
    const next = processMarket(state, action);
    expect(next.playerState.cash).toBe(75_000);
    // 60 + floor(25000/5000) = 65
    expect(next.playerState.reputation).toBe(65);
  });

  it("clamps reputation to 100", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, reputation: 99 } };
    const action: Action = { kind: "market.campaign", budget: 50_000 };
    const next = processMarket(state, action);
    expect(next.playerState.reputation).toBe(100);
  });

  it("rejects budget exceeding cash", () => {
    const state = baseState();
    const action: Action = { kind: "market.campaign", budget: 999_999 };
    expect(() => processMarket(state, action)).toThrow(/insufficient cash/i);
  });
});

describe("processMarket — market.adjustPricing", () => {
  it("scales MRR by 1 + deltaPct/100", () => {
    const state = baseState(); // mrr 10_000
    const next = processMarket(state, { kind: "market.adjustPricing", deltaPct: 20 });
    expect(next.playerState.mrr).toBe(12_000);
  });

  it("floors MRR at 0 for big negative deltas", () => {
    const state = baseState();
    const next = processMarket(state, { kind: "market.adjustPricing", deltaPct: -150 });
    expect(next.playerState.mrr).toBe(0);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/actions/market.ts`**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processMarket(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "market.campaign": {
      if (action.budget > state.playerState.cash) {
        throw new InvalidActionError(action, "insufficient cash for campaign");
      }
      const repGain = Math.floor(action.budget / 5_000);
      const reputation = Math.min(100, state.playerState.reputation + repGain);
      return {
        ...state,
        playerState: {
          ...state.playerState,
          cash: state.playerState.cash - action.budget,
          reputation,
        },
      };
    }
    case "market.adjustPricing": {
      const next = state.playerState.mrr * (1 + action.deltaPct / 100);
      return {
        ...state,
        playerState: {
          ...state.playerState,
          mrr: Math.max(0, Math.floor(next)),
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a market action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all market tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/actions/market.ts tests/unit/game/actions/market.test.ts
git commit -m "feat(engine): market action processor (campaign + pricing)"
```

---

### Task 8: Action processor — Stratégie (strategy)

**Files:**
- Create: `lib/game/actions/strategy.ts`, `tests/unit/game/actions/strategy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/actions/strategy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { processStrategy } from "@/lib/game/actions/strategy";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action, Competitor } from "@/lib/game/types";

const competitor = (): Competitor => ({
  id: "rival1",
  name: "RivalCo",
  scriptedPersona: "aggressive",
  scriptedState: { valuation: 50_000_000, teamSize: 30 },
});

const baseState = (): GameState => {
  const s = createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 10_000_000,
    startingTeamSize: 20,
  });
  return {
    ...s,
    worldState: { ...s.worldState, competitors: [competitor()] },
    playerState: { ...s.playerState, mrr: 50_000 },
  };
};

describe("processStrategy — strategy.partnership", () => {
  it("records a consequence with revShare and 4 quarters of effect", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.partnership", partnerName: "BigCo", revShare: 10 };
    const next = processStrategy(state, action);
    expect(next.history.activeConsequences).toHaveLength(1);
    expect(next.history.activeConsequences[0]).toMatchObject({
      remainingQuarters: 4,
    });
    expect(next.history.activeConsequences[0].description).toMatch(/BigCo.*10%/);
  });
});

describe("processStrategy — strategy.tryAcquire", () => {
  it("on success (offer >= 80% of valuation), removes competitor and debits cash", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "rival1", offerAmount: 40_000_000 };
    const next = processStrategy(state, action);
    expect(next.worldState.competitors).toHaveLength(0);
    expect(next.playerState.cash).toBe(10_000_000 - 40_000_000); // negative; engine tolerates
  });

  it("on failure (offer < 80% of valuation), returns state unchanged but records a key decision", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "rival1", offerAmount: 1_000_000 };
    const next = processStrategy(state, action);
    expect(next.worldState.competitors).toHaveLength(1);
    expect(next.playerState.cash).toBe(10_000_000);
    expect(next.history.keyDecisions.at(-1)?.summary).toMatch(/declined/i);
  });

  it("rejects acquiring a competitor that doesn't exist", () => {
    const state = baseState();
    const action: Action = { kind: "strategy.tryAcquire", competitorId: "ghost", offerAmount: 1 };
    expect(() => processStrategy(state, action)).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/actions/strategy.ts`**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";

export function processStrategy(state: GameState, action: Action): GameState {
  switch (action.kind) {
    case "strategy.partnership": {
      const consequence = {
        description: `Partnership with ${action.partnerName} active (${action.revShare}% rev share)`,
        remainingQuarters: 4,
      };
      return {
        ...state,
        history: {
          ...state.history,
          activeConsequences: [...state.history.activeConsequences, consequence],
        },
      };
    }
    case "strategy.tryAcquire": {
      const target = state.worldState.competitors.find((c) => c.id === action.competitorId);
      if (!target) {
        throw new InvalidActionError(action, `competitor ${action.competitorId} not found`);
      }
      const threshold = Math.floor(target.scriptedState.valuation * 0.8);
      if (action.offerAmount >= threshold) {
        return {
          ...state,
          playerState: {
            ...state.playerState,
            cash: state.playerState.cash - action.offerAmount,
          },
          worldState: {
            ...state.worldState,
            competitors: state.worldState.competitors.filter((c) => c.id !== action.competitorId),
          },
          history: {
            ...state.history,
            keyDecisions: [
              ...state.history.keyDecisions,
              {
                trimesterIndex: state.history.trimestersPlayed,
                summary: `Acquired ${target.name} for ${action.offerAmount}`,
              },
            ],
          },
        };
      }
      // Offer too low — declined
      return {
        ...state,
        history: {
          ...state.history,
          keyDecisions: [
            ...state.history.keyDecisions,
            {
              trimesterIndex: state.history.trimestersPlayed,
              summary: `Acquisition offer for ${target.name} declined (offer ${action.offerAmount} below threshold)`,
            },
          ],
        },
      };
    }
    default:
      throw new InvalidActionError(action as Action, "not a strategy action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all strategy tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/actions/strategy.ts tests/unit/game/actions/strategy.test.ts
git commit -m "feat(engine): strategy action processor (partnership + tryAcquire)"
```

---

### Task 9: Top-level action dispatcher

**Files:**
- Create: `lib/game/actions/index.ts`

- [ ] **Step 1: Implement the dispatcher (no new tests — existing per-category tests cover behavior; this only adds wiring)**

```ts
import type { Action, GameState } from "../types";
import { InvalidActionError } from "../types";
import { processFinance } from "./finance";
import { processTeam } from "./team";
import { processProduct } from "./product";
import { processMarket } from "./market";
import { processStrategy } from "./strategy";

export function processAction(state: GameState, action: Action): GameState {
  if (action.kind.startsWith("finance.")) return processFinance(state, action);
  if (action.kind.startsWith("team.")) return processTeam(state, action);
  if (action.kind.startsWith("product.")) return processProduct(state, action);
  if (action.kind.startsWith("market.")) return processMarket(state, action);
  if (action.kind.startsWith("strategy.")) return processStrategy(state, action);
  if (action.kind.startsWith("endgame.")) {
    throw new InvalidActionError(
      action,
      "endgame.* actions are handled by lib/game/endings.ts, not the action dispatcher",
    );
  }
  throw new InvalidActionError(action, `unknown action kind: ${(action as Action).kind}`);
}

export { processFinance, processTeam, processProduct, processMarket, processStrategy };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/actions/index.ts
git commit -m "feat(engine): top-level processAction dispatcher"
```

---

### Task 10: Endings — auto-detect + player-initiated

**Files:**
- Create: `lib/game/endings.ts`, `tests/unit/game/endings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/endings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectAutoEnding, applyPlayerEnding } from "@/lib/game/endings";
import { createInitialState } from "@/lib/game/state";
import type { GameState, Action } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 100_000,
    startingTeamSize: 3,
  });

describe("detectAutoEnding", () => {
  it("returns null on a healthy state", () => {
    expect(detectAutoEnding(baseState())).toBeNull();
  });

  it("detects bankruptcy when cash <= 0", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, cash: 0 } };
    expect(detectAutoEnding(state)?.kind).toBe("bankruptcy");
  });

  it("detects burnout when founderBurnout >= 100", () => {
    const state = { ...baseState(), playerState: { ...baseState().playerState, founderBurnout: 100 } };
    expect(detectAutoEnding(state)?.kind).toBe("burnout");
  });

  it("prefers burnout over bankruptcy when both apply", () => {
    const state = {
      ...baseState(),
      playerState: { ...baseState().playerState, cash: 0, founderBurnout: 100 },
    };
    expect(detectAutoEnding(state)?.kind).toBe("burnout");
  });
});

describe("applyPlayerEnding", () => {
  it("creates an ipo ending with the trimester index", () => {
    const state = { ...baseState(), history: { ...baseState().history, trimestersPlayed: 30 } };
    const action: Action = { kind: "endgame.declareIPO" };
    const ending = applyPlayerEnding(state, action);
    expect(ending.kind).toBe("ipo");
    expect(ending.trimesterIndex).toBe(30);
  });

  it("creates an acquisition ending capturing the price", () => {
    const action: Action = { kind: "endgame.acceptAcquisition", acquirerName: "BigCo", price: 50_000_000 };
    const ending = applyPlayerEnding(baseState(), action);
    expect(ending.kind).toBe("acquisition");
    expect(ending.summary).toMatch(/BigCo.*50000000/);
  });

  it("creates a lifestyle ending", () => {
    const ending = applyPlayerEnding(baseState(), { kind: "endgame.declareLifestyle" });
    expect(ending.kind).toBe("lifestyle");
  });

  it("creates a conglomerate ending", () => {
    const ending = applyPlayerEnding(baseState(), { kind: "endgame.declareConglomerate" });
    expect(ending.kind).toBe("conglomerate");
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/endings.ts`**

```ts
import type { Action, Ending, GameState } from "./types";
import { InvalidActionError } from "./types";

export function detectAutoEnding(state: GameState): Ending | null {
  if (state.playerState.founderBurnout >= 100) {
    return {
      kind: "burnout",
      trimesterIndex: state.history.trimestersPlayed,
      summary: "Le fondateur s'est effondré. Burnout total.",
    };
  }
  if (state.playerState.cash <= 0) {
    return {
      kind: "bankruptcy",
      trimesterIndex: state.history.trimestersPlayed,
      summary: `${state.playerState.companyName} a épuisé sa trésorerie. Liquidation.`,
    };
  }
  return null;
}

export function applyPlayerEnding(state: GameState, action: Action): Ending {
  const trimesterIndex = state.history.trimestersPlayed;
  switch (action.kind) {
    case "endgame.declareIPO":
      return {
        kind: "ipo",
        trimesterIndex,
        summary: `${state.playerState.companyName} entre en bourse.`,
      };
    case "endgame.acceptAcquisition":
      return {
        kind: "acquisition",
        trimesterIndex,
        summary: `${state.playerState.companyName} racheté par ${action.acquirerName} pour ${action.price}.`,
      };
    case "endgame.declareLifestyle":
      return {
        kind: "lifestyle",
        trimesterIndex,
        summary: `${state.playerState.companyName} maintenu en lifestyle business.`,
      };
    case "endgame.declareConglomerate":
      return {
        kind: "conglomerate",
        trimesterIndex,
        summary: `${state.playerState.companyName} devient un conglomérat multi-verticales.`,
      };
    default:
      throw new InvalidActionError(action as Action, "not a player-initiated ending action");
  }
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all endings tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/endings.ts tests/unit/game/endings.test.ts
git commit -m "feat(engine): endings — auto-detect + player-initiated"
```

---

### Task 11: IA-boundary interfaces

**Files:**
- Create: `lib/game/ia/types.ts`

- [ ] **Step 1: Implement the interfaces (types only — no test, no logic)**

```ts
import type { Action, GameState, TrimesterEvent, Decision } from "../types";

export type GameMasterOpening = {
  narration: string;
  event: TrimesterEvent | null;
};

export type GameMasterClosing = {
  narration: string;
  newState: GameState;
};

export interface IGameMaster {
  /** Compose the trimester opening: narration of context + maybe an event. */
  openTrimester(state: GameState): Promise<GameMasterOpening>;

  /** Resolve the trimester: combine player decisions into the next state and narrate. */
  closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing>;
}

export type ValidatorVerdict =
  | { accepted: true; action: Action }
  | { accepted: false; reason: string };

export interface IValidator {
  /** Translate a free-text NL action into a structured Action, or reject with a reason. */
  validate(state: GameState, naturalLanguage: string): Promise<ValidatorVerdict>;
}

export interface IAdvisor {
  /** Return a short recommendation tailored to the current state. */
  recommend(state: GameState): Promise<string>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/ia/types.ts
git commit -m "feat(engine): IA boundary interfaces (GameMaster, Validator, Advisor)"
```

---

### Task 12: Mock IA implementations

**Files:**
- Create: `lib/game/ia/mock.ts`

- [ ] **Step 1: Implement deterministic mocks (used by engine tests + Plan #4 will swap them out)**

```ts
import type {
  IGameMaster,
  GameMasterOpening,
  GameMasterClosing,
  IValidator,
  ValidatorVerdict,
  IAdvisor,
} from "./types";
import type { Action, Decision, GameState } from "../types";
import { processAction } from "../actions";
import { applyBurnoutDelta, BURNOUT_DELTAS } from "../burnout";
import { computeRunwayMonths } from "../state";

/**
 * Deterministic GM used for tests. Generates a canned opening narration,
 * surfaces a single canned event every 3rd trimester, and at close time
 * folds player decisions into the next state by re-running each action
 * through the pure processors and applying baseline burnout deltas.
 */
export class MockGameMaster implements IGameMaster {
  async openTrimester(state: GameState): Promise<GameMasterOpening> {
    const narration = `[mock] Q${state.scenario.currentQuarter.slice(1)} ${state.scenario.currentYear}: market is ${state.worldState.marketConditions}.`;
    const fireEvent = state.history.trimestersPlayed > 0 && state.history.trimestersPlayed % 3 === 0;
    if (!fireEvent) return { narration, event: null };
    return {
      narration,
      event: {
        id: `evt-${state.history.trimestersPlayed}`,
        situation: "[mock event] An investor offers a quick term sheet.",
        choices: [
          { id: "accept", label: "Accept" },
          { id: "negotiate", label: "Negotiate" },
          { id: "decline", label: "Decline" },
        ],
      },
    };
  }

  async closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing> {
    let next = state;
    let firedSomeone = false;
    let raised = false;
    let shipped = false;

    for (const d of decisions) {
      if (d.kind !== "action") continue;
      try {
        next = processAction(next, d.action);
      } catch {
        // Mock GM tolerates invalid actions; real GM/Validator filter them earlier.
      }
      if (d.action.kind === "team.fire") firedSomeone = true;
      if (d.action.kind === "finance.raiseFunds") raised = true;
      if (d.action.kind === "product.launch") shipped = true;
    }

    // Burnout deltas at close
    let burnout = next.playerState.founderBurnout + BURNOUT_DELTAS.baseline;
    if (firedSomeone) burnout += BURNOUT_DELTAS.firedSomeone;
    if (raised) burnout += BURNOUT_DELTAS.successfulRaise;
    if (shipped) burnout += BURNOUT_DELTAS.shippedProduct;
    const runway = computeRunwayMonths({
      cash: next.playerState.cash,
      teamSize: next.playerState.teamSize,
    });
    if (runway < 3) burnout += BURNOUT_DELTAS.runwayCritical;

    const newPlayerState = {
      ...next.playerState,
      founderBurnout: applyBurnoutDelta(next.playerState.founderBurnout, burnout - next.playerState.founderBurnout),
      runwayMonths: runway,
    };

    // Tick consequences
    const consequences = next.history.activeConsequences
      .map((c) => ({ ...c, remainingQuarters: c.remainingQuarters - 1 }))
      .filter((c) => c.remainingQuarters > 0);

    // Advance time
    const order: Array<"Q1" | "Q2" | "Q3" | "Q4"> = ["Q1", "Q2", "Q3", "Q4"];
    const idx = order.indexOf(next.scenario.currentQuarter);
    const nextQuarter = order[(idx + 1) % 4]!;
    const nextYear =
      nextQuarter === "Q1" ? next.scenario.currentYear + 1 : next.scenario.currentYear;

    return {
      narration: `[mock] Closing Q${idx + 1} ${next.scenario.currentYear}. ${decisions.length} decisions applied.`,
      newState: {
        ...next,
        playerState: newPlayerState,
        scenario: { ...next.scenario, currentQuarter: nextQuarter, currentYear: nextYear },
        history: {
          ...next.history,
          trimestersPlayed: next.history.trimestersPlayed + 1,
          activeConsequences: consequences,
        },
      },
    };
  }
}

export class MockValidator implements IValidator {
  async validate(_state: GameState, naturalLanguage: string): Promise<ValidatorVerdict> {
    return { accepted: false, reason: `[mock] cannot interpret: "${naturalLanguage}"` };
  }
}

export class MockAdvisor implements IAdvisor {
  async recommend(state: GameState): Promise<string> {
    if (state.playerState.runwayMonths < 6) {
      return "[mock advice] Runway is short. Consider raising funds or cutting burn.";
    }
    return "[mock advice] State looks healthy. Keep building.";
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/ia/mock.ts
git commit -m "feat(engine): deterministic Mock IA implementations for tests"
```

---

### Task 13: Engine orchestrator — single trimester loop

**Files:**
- Create: `lib/game/engine.ts`, `tests/unit/game/engine.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/engine.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { advanceTrimester } from "@/lib/game/engine";
import { createInitialState } from "@/lib/game/state";
import { MockGameMaster } from "@/lib/game/ia/mock";
import type { Decision, GameState } from "@/lib/game/types";

const baseState = (): GameState =>
  createInitialState({
    scenario: {
      presetId: "test",
      era: 2005,
      region: "T",
      sector: "T",
      startingYear: 2005,
      currentQuarter: "Q1",
      currentYear: 2005,
    },
    companyName: "TestCo",
    startingCash: 200_000,
    startingTeamSize: 2,
  });

describe("advanceTrimester", () => {
  it("returns opening narration, no event on trimester 0, applies decisions, and increments trimestersPlayed", async () => {
    const gm = new MockGameMaster();
    const decisions: Decision[] = [
      { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 20_000 } },
    ];
    const result = await advanceTrimester({ state: baseState(), decisions, gm });

    expect(result.opening.narration).toContain("[mock]");
    expect(result.opening.event).toBeNull();
    expect(result.closing.narration).toContain("[mock]");
    expect(result.newState.history.trimestersPlayed).toBe(1);
    // Cash decreased by 20k (allocateBudget) — burn is NOT subtracted by the engine yet (deferred to scenario plans)
    expect(result.newState.playerState.cash).toBe(180_000);
    expect(result.newState.scenario.currentQuarter).toBe("Q2");
  });

  it("surfaces an event at trimester 3 (per the mock cadence)", async () => {
    const gm = new MockGameMaster();
    let state = baseState();
    for (let i = 0; i < 3; i++) {
      const r = await advanceTrimester({ state, decisions: [], gm });
      state = r.newState;
    }
    // Now trimestersPlayed === 3, next opening should fire an event
    const r = await advanceTrimester({ state, decisions: [], gm });
    expect(r.opening.event).not.toBeNull();
    expect(r.opening.event?.choices).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/engine.ts`**

```ts
import type { Decision, GameState, TrimesterEvent } from "./types";
import type { IGameMaster } from "./ia/types";

export type AdvanceTrimesterArgs = {
  state: GameState;
  decisions: Decision[];
  gm: IGameMaster;
};

export type AdvanceTrimesterResult = {
  opening: { narration: string; event: TrimesterEvent | null };
  closing: { narration: string };
  newState: GameState;
};

/**
 * Run a single trimester loop:
 *   1. Open: GM narrates context and may surface an event.
 *   2. Plan: caller has already collected decisions (passed in).
 *   3. Close: GM folds decisions into the next state and narrates outcome.
 *
 * The engine is pure orchestration — it does not access the DB.
 * Persistence is a separate concern (see lib/game/persistence.ts).
 */
export async function advanceTrimester(
  args: AdvanceTrimesterArgs,
): Promise<AdvanceTrimesterResult> {
  const opening = await args.gm.openTrimester(args.state);
  const closing = await args.gm.closeTrimester(args.state, args.decisions);
  return {
    opening,
    closing: { narration: closing.narration },
    newState: closing.newState,
  };
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test`
Expected: all engine tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/engine.ts tests/unit/game/engine.test.ts
git commit -m "feat(engine): trimester orchestrator (advanceTrimester)"
```

---

### Task 14: DB schema extension — `game` and `trimester` tables

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Append the two new table definitions to `lib/db/schema.ts`**

At the bottom of `lib/db/schema.ts`, after the existing Auth.js tables, add:

```ts
import { integer, jsonb } from "drizzle-orm/pg-core";
import type { GameState, TrimesterEvent, Decision } from "@/lib/game/types";

export const games = pgTable("game", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scenarioPresetId: text("scenarioPresetId").notNull(),
  status: text("status", {
    enum: ["in_progress", "ended_success", "ended_fail"],
  })
    .notNull()
    .default("in_progress"),
  endingType: text("endingType"),
  endingSummary: text("endingSummary"),
  currentTrimesterIndex: integer("currentTrimesterIndex").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const trimesters = pgTable(
  "trimester",
  {
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    trimesterIndex: integer("trimesterIndex").notNull(),
    state: jsonb("state").$type<GameState>().notNull(),
    narrationOpening: text("narrationOpening"),
    narrationClosing: text("narrationClosing"),
    event: jsonb("event").$type<TrimesterEvent | null>(),
    decisions: jsonb("decisions").$type<Decision[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.trimesterIndex] })],
);
```

Note: the existing top-of-file imports (`pgTable`, `text`, `timestamp`, `primaryKey`, `integer` from `drizzle-orm/pg-core`) need `jsonb` and `integer` added if not already there. Open `lib/db/schema.ts` and verify the import line — if it doesn't already include `jsonb`, expand it.

- [ ] **Step 2: Generate the migration**

```bash
set -a && source .env.local && set +a
npm run db:generate
```

Expected: a new file `drizzle/0001_*.sql` containing `CREATE TABLE "game"` and `CREATE TABLE "trimester"`, plus FK constraints.

- [ ] **Step 3: Apply the migration**

```bash
set -a && source .env.local && set +a
npm run db:migrate
```

Expected: migration applied successfully.

- [ ] **Step 4: Verify tables exist**

```bash
docker compose exec postgres psql -U venture -d venture_historia -c "\dt"
```

Expected: tables `game` and `trimester` listed alongside the existing 4 auth tables.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(engine): add game + trimester tables and migration"
```

---

### Task 15: Persistence — createGame and loadGame

**Files:**
- Create: `lib/game/persistence.ts`

- [ ] **Step 1: Implement persistence functions (no unit test — covered by Task 19's integration test)**

```ts
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, trimesters } from "@/lib/db/schema";
import type { Decision, GameState, TrimesterEvent, Ending, EndingKind } from "./types";

export type GameRow = typeof games.$inferSelect;
export type TrimesterRow = typeof trimesters.$inferSelect;

export async function createGame(args: {
  userId: string;
  scenarioPresetId: string;
  initialState: GameState;
}): Promise<GameRow> {
  const [game] = await db
    .insert(games)
    .values({
      userId: args.userId,
      scenarioPresetId: args.scenarioPresetId,
    })
    .returning();
  if (!game) throw new Error("createGame: insert returned no row");

  await db.insert(trimesters).values({
    gameId: game.id,
    trimesterIndex: 0,
    state: args.initialState,
  });

  return game;
}

export async function loadGame(gameId: string): Promise<GameRow | null> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return game ?? null;
}

export async function loadTrimester(
  gameId: string,
  trimesterIndex: number,
): Promise<TrimesterRow | null> {
  const [t] = await db
    .select()
    .from(trimesters)
    .where(and(eq(trimesters.gameId, gameId), eq(trimesters.trimesterIndex, trimesterIndex)))
    .limit(1);
  return t ?? null;
}

export async function saveTrimester(args: {
  gameId: string;
  trimesterIndex: number;
  state: GameState;
  narrationOpening: string | null;
  narrationClosing: string | null;
  event: TrimesterEvent | null;
  decisions: Decision[];
}): Promise<void> {
  await db.insert(trimesters).values({
    gameId: args.gameId,
    trimesterIndex: args.trimesterIndex,
    state: args.state,
    narrationOpening: args.narrationOpening,
    narrationClosing: args.narrationClosing,
    event: args.event,
    decisions: args.decisions,
  });
  await db
    .update(games)
    .set({ currentTrimesterIndex: args.trimesterIndex, updatedAt: new Date() })
    .where(eq(games.id, args.gameId));
}

export async function endGame(args: {
  gameId: string;
  ending: Ending;
}): Promise<void> {
  const successKinds: EndingKind[] = ["ipo", "acquisition", "lifestyle", "conglomerate"];
  const status = successKinds.includes(args.ending.kind) ? "ended_success" : "ended_fail";
  await db
    .update(games)
    .set({
      status,
      endingType: args.ending.kind,
      endingSummary: args.ending.summary,
      updatedAt: new Date(),
    })
    .where(eq(games.id, args.gameId));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/persistence.ts
git commit -m "feat(engine): persistence layer (createGame, load*, saveTrimester, endGame)"
```

---

### Task 16: Vitest integration config

**Files:**
- Create: `vitest.integration.config.ts`, `tests/integration/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `vitest.integration.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    globals: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Create `tests/integration/setup.ts`** (helper used by integration tests to clean up after themselves)

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Create a throwaway user so each integration test has its own scope.
 * Cascade deletes wipe games + trimesters when the user is removed.
 */
export async function createTestUser(suffix: string): Promise<{ id: string; cleanup: () => Promise<void> }> {
  const email = `it-${suffix}-${Date.now()}@test.local`;
  const [row] = await db
    .insert(users)
    .values({ email, name: `Integration ${suffix}` })
    .returning({ id: users.id });
  if (!row) throw new Error("createTestUser: insert returned no row");
  return {
    id: row.id,
    cleanup: async () => {
      await db.delete(users).where(eq(users.id, row.id));
    },
  };
}
```

- [ ] **Step 3: Add `test:integration` script to `package.json` scripts**

Edit `package.json`, in the `scripts` block add:

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

(Place it between `"test:e2e"` and `"db:generate"`.)

- [ ] **Step 4: Smoke-run the integration suite (it'll find no tests yet — that's expected)**

```bash
set -a && source .env.local && set +a
npm run test:integration
```

Expected: vitest reports `No test files found, exiting with code 1` OR similar — it's fine that there are no tests yet, the config just needs to load cleanly. If vitest exits 1 because of no tests, that's OK for this step; the next task adds the test.

- [ ] **Step 5: Commit**

```bash
git add vitest.integration.config.ts tests/integration/setup.ts package.json
git commit -m "test(engine): vitest integration config + test-user helper"
```

---

### Task 17: Integration test — full 5-trimester playthrough

**Files:**
- Create: `tests/integration/game/playthrough.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/game/playthrough.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createInitialState } from "@/lib/game/state";
import { advanceTrimester } from "@/lib/game/engine";
import { MockGameMaster } from "@/lib/game/ia/mock";
import {
  createGame,
  loadGame,
  loadTrimester,
  saveTrimester,
  endGame,
} from "@/lib/game/persistence";
import { detectAutoEnding } from "@/lib/game/endings";
import { createTestUser } from "../setup";
import type { Decision } from "@/lib/game/types";

describe("game playthrough", () => {
  let cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const c of cleanups.splice(0)) {
      await c();
    }
  });

  it("plays 5 trimesters end-to-end, persists each, and finalises with no auto-ending", async () => {
    const user = await createTestUser("playthrough-happy");
    cleanups.push(user.cleanup);

    const initialState = createInitialState({
      scenario: {
        presetId: "it_happy",
        era: 2005,
        region: "Test",
        sector: "Test",
        startingYear: 2005,
        currentQuarter: "Q1",
        currentYear: 2005,
      },
      companyName: "PlaythroughCo",
      startingCash: 1_000_000,
      startingTeamSize: 3,
    });

    const game = await createGame({
      userId: user.id,
      scenarioPresetId: "it_happy",
      initialState,
    });
    expect(game.id).toBeTruthy();
    expect(game.currentTrimesterIndex).toBe(0);

    const gm = new MockGameMaster();
    let state = initialState;

    for (let i = 1; i <= 5; i++) {
      const decisions: Decision[] = [
        { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 10_000 } },
      ];
      const result = await advanceTrimester({ state, decisions, gm });
      await saveTrimester({
        gameId: game.id,
        trimesterIndex: i,
        state: result.newState,
        narrationOpening: result.opening.narration,
        narrationClosing: result.closing.narration,
        event: result.opening.event,
        decisions,
      });
      state = result.newState;
    }

    // Verify persistence
    const persisted = await loadGame(game.id);
    expect(persisted?.currentTrimesterIndex).toBe(5);

    const t5 = await loadTrimester(game.id, 5);
    expect(t5).not.toBeNull();
    expect(t5?.state.history.trimestersPlayed).toBe(5);
    expect(t5?.decisions).toHaveLength(1);
    expect(t5?.narrationOpening).toContain("[mock]");
    expect(t5?.narrationClosing).toContain("[mock]");

    // Cash should have decreased by 5 × 10_000 = 50_000
    expect(t5?.state.playerState.cash).toBe(1_000_000 - 50_000);

    // No auto-ending yet
    expect(detectAutoEnding(state)).toBeNull();
  });

  it("detects bankruptcy and stores the ending when cash hits 0", async () => {
    const user = await createTestUser("playthrough-bankruptcy");
    cleanups.push(user.cleanup);

    const initialState = createInitialState({
      scenario: {
        presetId: "it_broke",
        era: 2005,
        region: "Test",
        sector: "Test",
        startingYear: 2005,
        currentQuarter: "Q1",
        currentYear: 2005,
      },
      companyName: "BrokeCo",
      startingCash: 30_000,
      startingTeamSize: 1,
    });

    const game = await createGame({
      userId: user.id,
      scenarioPresetId: "it_broke",
      initialState,
    });

    const gm = new MockGameMaster();
    // Spend all cash in one trimester
    const decisions: Decision[] = [
      { kind: "action", action: { kind: "finance.allocateBudget", category: "marketing", amount: 30_000 } },
    ];
    const result = await advanceTrimester({ state: initialState, decisions, gm });
    await saveTrimester({
      gameId: game.id,
      trimesterIndex: 1,
      state: result.newState,
      narrationOpening: result.opening.narration,
      narrationClosing: result.closing.narration,
      event: result.opening.event,
      decisions,
    });

    expect(result.newState.playerState.cash).toBe(0);
    const ending = detectAutoEnding(result.newState);
    expect(ending?.kind).toBe("bankruptcy");

    if (ending) await endGame({ gameId: game.id, ending });
    const persisted = await loadGame(game.id);
    expect(persisted?.status).toBe("ended_fail");
    expect(persisted?.endingType).toBe("bankruptcy");
    expect(persisted?.endingSummary).toMatch(/BrokeCo/);
  });
});
```

- [ ] **Step 2: Run the integration suite**

```bash
set -a && source .env.local && set +a
npm run test:integration
```

Expected: 2 tests pass. If the test fails because `playerState.cash` is wrong, double-check that `processFinance.allocateBudget` debits cash (Task 4) — the closing-phase mock GM re-applies the same decisions so they should compose cleanly.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/game/playthrough.test.ts
git commit -m "test(engine): integration playthrough (5 trimesters + bankruptcy ending)"
```

---

### Task 18: Final cross-cutting verification

**Files:** none

- [ ] **Step 1: Run all the checks back-to-back**

```bash
npx tsc --noEmit
npm test
set -a && source .env.local && set +a
npm run test:integration
npm run test:e2e
```

Expected: tsc clean; unit tests all green (existing env loader tests + every game module test); integration tests both green; E2E (Foundation auth gates) still green.

- [ ] **Step 2: Run a clean production build**

```bash
rm -rf .next
npm run build
```

Expected: build completes without errors, all routes still listed.

- [ ] **Step 3: No commit needed**

The Game Engine Core plan is complete. Plan #3 (Scenario preset content) picks up from here.

---

## Self-Review

Run by the plan author after writing the plan, before handing off.

**Spec coverage check** (against `docs/superpowers/specs/2026-04-25-venture-historia-design.md` § 2-6 + § 10):
- ✅ Hybrid trimester loop (opening / planning / event / closing) — Task 13
- ✅ 5-category structured action menu — Tasks 4-8 (2 actions per category as scaffolding; Plan #3 expands)
- ✅ Contextual events surfaced by GM mid-trimester — Tasks 12 (mock implementation) + 13 (engine plumbing)
- ✅ NL escape hatch via Validator — Task 11 (interface) + Task 12 (mock returns "not understood"; Plan #4 makes it real)
- ✅ Visible state metrics: cash, teamSize, mrr, reputation, runwayMonths, founderBurnout — Task 1 + Task 3 + Task 7
- ✅ Burnout gauge as fail-state metric — Task 3 + Task 10
- ✅ Save/resume via persisted state — Tasks 14-15-17 (rows include serialized state; Plan #6 will add UX)
- ✅ Multiple endings (4 success + 4 fail) — Task 10 implements 6 of the 8; ousting + industry_collapse are deferred to Plan #3 (require scripted competitors / macro events)
- ✅ IA architecture — interfaces + mocks — Tasks 11-12 (real Claude in Plan #4)
- ⏸ Scenario preset content (SF 2005 SaaS) — explicitly deferred to Plan #3
- ⏸ Real IA — Plan #4
- ⏸ UI / dashboard — Plan #5
- ⏸ Credits ledger — Plan #7

**Placeholder scan**: no "TBD", no "implement later", no untested assertions, no "similar to Task N" shortcuts. The two endings deferred to Plan #3 are explicitly listed in Out of scope and the Self-Review.

**Type-consistency check**:
- `Action` discriminated-union members use the same `kind` strings throughout (e.g. `"finance.raiseFunds"` in Task 1's type, Task 4's processor, Task 9's dispatcher).
- `processAction(state, action)` exists in Task 9 and is consumed by `MockGameMaster.closeTrimester` in Task 12.
- `IGameMaster` interface in Task 11 is implemented by `MockGameMaster` in Task 12 with the same method signatures (`openTrimester`, `closeTrimester`).
- `GameState`, `Decision`, `TrimesterEvent` are imported consistently from `@/lib/game/types` (and from `@/lib/db/schema` once the jsonb columns import them in Task 14).
- Persistence row types `GameRow`/`TrimesterRow` (Task 15) use Drizzle's `$inferSelect` on the schema defined in Task 14, so columns are guaranteed to match.
- Engine `advanceTrimester` returns `{ opening, closing, newState }` in Task 13 and the integration test in Task 17 reads exactly those fields.
