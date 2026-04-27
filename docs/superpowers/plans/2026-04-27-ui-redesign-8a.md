# UI Redesign 8a — Game Page + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the in-game `/games/[gameId]` page to a no-scroll dashboard layout (top bar + 50/50 body) on a new dark navy / accent-colored design system, with a first-game guided tutorial overlay, a persistent contextual hint panel, and metric tooltips — covering the user-facing "ennuyeux / incompréhensible / scroll" feedback.

**Architecture:** Build outwards from pure logic to chrome. Phase 1 ships three pure modules (`pickHint`, `METRICS`, `TUTORIAL_STEPS`) with full unit coverage. Phase 2 adds Tailwind v4 `@theme` tokens and Inter / JetBrains Mono via `next/font`. Phase 3 introduces 7 design-system primitives in `components/ui/` (Panel, Button, Field, Tabs, Tooltip, MetricCell, ViewportGuard) — each is presentation-only, so verification is via E2E + tsc, not RTL. Phase 4 rewrites the game page (new top bar, contextual hint panel, restyled existing components, deleted `metrics-header.tsx`). Phase 5 adds the tutorial overlay client component (gated on `localStorage["vh_tutorial_seen_v1"]`) and a replay button. Phase 6 fixes the two existing E2E specs that would now collide with the overlay, adds 6 new onboarding E2E tests, and runs the full cross-cutting verification.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict + `noUncheckedIndexedAccess`, Tailwind v4 (CSS-only `@theme` config), `next/font/google` for Inter and JetBrains Mono. **No new runtime dependencies** — no shadcn/ui, no Radix, no Framer Motion.

---

## Scope

**In scope (Plan #8a):**
- Pure logic: `lib/game/ui/contextual-hints.ts`, `lib/game/ui/metric-definitions.ts`, `lib/game/ui/tutorial-steps.ts` and their unit tests.
- Tailwind theme tokens (palette + font tokens) in `app/globals.css`.
- Font loading (Inter + JetBrains Mono) in `app/layout.tsx`.
- Design-system primitives in `components/ui/`: Panel, Button, Field, Tabs, Tooltip, MetricCell, ViewportGuard.
- Game page rewrite: `app/(app)/games/[gameId]/page.tsx` + new `top-bar.tsx` + new `contextual-hint-panel.tsx` + restyled existing components (`trimester-narration.tsx`, `decision-list.tsx`, `action-menu.tsx`, `action-forms.tsx`, `advisor-panel.tsx`, `event-modal.tsx`, `nl-escape-form.tsx`).
- Deletion of `app/(app)/games/[gameId]/_components/metrics-header.tsx` (replaced by `top-bar.tsx`).
- ViewportGuard wired into `app/(app)/layout.tsx` so the redirect-to-desktop placeholder also covers the dashboard / end pages (which #8b will redesign).
- Restyle of the `AUTH_DEV_BYPASS` banner in `app/(app)/layout.tsx` to match the new palette.
- Tutorial overlay (`tutorial-overlay.tsx`) and replay button (`tutorial-replay-button.tsx`).
- E2E: new `tests/e2e/onboarding.spec.ts` (6 tests). Fix `tests/e2e/play-game.spec.ts` and `tests/e2e/nl-and-advisor.spec.ts` to pre-set the tutorial-seen localStorage flag via `addInitScript`.

**Out of scope (Plan #8b or later):**
- Dashboard redesign (`app/(app)/dashboard/page.tsx`).
- End screen redesign (`app/(app)/games/[gameId]/end/page.tsx`).
- Sign-in / landing page styling.
- DB schema changes.
- Server-action signature or behavior changes (`addDecisionAction`, `advanceTrimesterAction`, etc., are unchanged).
- IA layer changes (`buildGameMaster`, `buildValidator`, `buildAdvisor`, prompts).
- Server-side persistence of "tutorial seen" (stays localStorage; future enhancement).
- Streaming / animations beyond CSS transitions.
- Mobile or touch optimization.

---

## File Structure

```
venture-historia/
├── app/
│   ├── globals.css                                # MODIFY (add @theme block)
│   ├── layout.tsx                                 # MODIFY (load Inter + JetBrains Mono)
│   └── (app)/
│       ├── layout.tsx                             # MODIFY (wrap in ViewportGuard, restyle bypass banner)
│       └── games/
│           └── [gameId]/
│               ├── page.tsx                       # REWRITE (new layout, mounts overlay)
│               └── _components/
│                   ├── metrics-header.tsx         # DELETE (replaced by top-bar.tsx)
│                   ├── top-bar.tsx                # CREATE
│                   ├── trimester-narration.tsx    # RESTYLE
│                   ├── decision-list.tsx          # RESTYLE
│                   ├── contextual-hint-panel.tsx  # CREATE
│                   ├── action-menu.tsx            # RESTYLE (uses Tabs)
│                   ├── action-forms.tsx           # RESTYLE (uses Field + Button)
│                   ├── nl-escape-form.tsx         # RESTYLE (uses Field + Button)
│                   ├── advisor-panel.tsx          # RESTYLE
│                   ├── event-modal.tsx            # RESTYLE
│                   ├── tutorial-overlay.tsx       # CREATE
│                   └── tutorial-replay-button.tsx # CREATE
├── components/
│   └── ui/                                        # CREATE (new top-level dir)
│       ├── panel.tsx                              # CREATE
│       ├── button.tsx                             # CREATE
│       ├── field.tsx                              # CREATE
│       ├── tabs.tsx                               # CREATE
│       ├── tooltip.tsx                            # CREATE
│       ├── metric-cell.tsx                        # CREATE
│       └── viewport-guard.tsx                     # CREATE
├── lib/
│   └── game/
│       └── ui/                                    # CREATE
│           ├── contextual-hints.ts                # CREATE
│           ├── metric-definitions.ts              # CREATE
│           └── tutorial-steps.ts                  # CREATE
└── tests/
    ├── unit/
    │   └── game/
    │       └── ui/
    │           ├── contextual-hints.test.ts       # CREATE
    │           ├── metric-definitions.test.ts     # CREATE
    │           └── tutorial-steps.test.ts         # CREATE
    └── e2e/
        ├── play-game.spec.ts                      # MODIFY (addInitScript)
        ├── nl-and-advisor.spec.ts                 # MODIFY (addInitScript)
        └── onboarding.spec.ts                     # CREATE
```

**Path alias:** `tsconfig.json` maps `@/*` → `./*`. Use `@/components/ui/panel`, `@/lib/game/ui/contextual-hints`, etc.

---

## Tasks

### Task 1: `pickHint` pure function + unit tests

**Files:**
- Create: `lib/game/ui/contextual-hints.ts`
- Create: `tests/unit/game/ui/contextual-hints.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/game/ui/contextual-hints.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickHint } from "@/lib/game/ui/contextual-hints";
import type { GameState } from "@/lib/game/types";

function baseState(overrides: Partial<GameState["playerState"]> = {}): GameState {
  return {
    playerState: {
      companyName: "TestCo",
      cash: 100_000,
      mrr: 0,
      teamSize: 1,
      runwayMonths: 12,
      founderBurnout: 30,
      boardTension: 20,
      reputation: 50,
      products: [],
      investors: [],
      ...overrides,
    },
    scenario: {
      currentQuarter: "Q1",
      currentYear: 2005,
      totalTrimesters: 12,
    },
    worldState: { marketConditions: "neutral", competitors: [] },
    history: { trimestersPlayed: 0, activeConsequences: [] },
  } as GameState;
}

describe("pickHint", () => {
  it("rule 1: runwayMonths <= 3 → runway-critical", () => {
    const r = pickHint(baseState({ runwayMonths: 3 }));
    expect(r.id).toBe("runway-critical");
    expect(r.message).toMatch(/Faillite imminente/);
  });

  it("rule 1 boundary: runwayMonths = 0 still fires runway-critical", () => {
    expect(pickHint(baseState({ runwayMonths: 0 })).id).toBe("runway-critical");
  });

  it("rule 2: founderBurnout > 75 → burnout-high (when runway is OK)", () => {
    const r = pickHint(baseState({ runwayMonths: 12, founderBurnout: 80 }));
    expect(r.id).toBe("burnout-high");
  });

  it("rule 3: boardTension > 70 → board-hostile (when runway and burnout OK)", () => {
    const r = pickHint(baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 75 }));
    expect(r.id).toBe("board-hostile");
  });

  it("rule 4: 3 < runwayMonths < 6 → runway-short", () => {
    const r = pickHint(baseState({ runwayMonths: 5 }));
    expect(r.id).toBe("runway-short");
  });

  it("rule 5: trimestersPlayed === 0 (and nothing more critical) → first-trimester", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 0;
    expect(pickHint(s).id).toBe("first-trimester");
  });

  it("rule 6: no launched product after trimester 4 → no-product-yet", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [{ name: "p1", launched: false, quartersUntilLaunch: 2 } as never];
    expect(pickHint(s).id).toBe("no-product-yet");
  });

  it("rule 6 ignores when at least one product is launched", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 5;
    s.playerState.products = [{ name: "p1", launched: true, quartersUntilLaunch: 0 } as never];
    expect(pickHint(s).id).toBe("stable");
  });

  it("fallback: stable", () => {
    const s = baseState({ runwayMonths: 12, founderBurnout: 30, boardTension: 20 });
    s.history.trimestersPlayed = 6;
    s.playerState.products = [{ name: "p1", launched: true, quartersUntilLaunch: 0 } as never];
    const r = pickHint(s);
    expect(r.id).toBe("stable");
    expect(r.message).toMatch(/État stable/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/unit/game/ui/contextual-hints.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

`lib/game/ui/contextual-hints.ts`:

```ts
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
  const anyLaunched = ps.products.some((p) => p.launched);
  if (!anyLaunched && hist.trimestersPlayed >= 4) {
    return { id: "no-product-yet", message: HINTS["no-product-yet"]! };
  }
  return { id: "stable", message: HINTS["stable"]! };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/unit/game/ui/contextual-hints.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ui/contextual-hints.ts tests/unit/game/ui/contextual-hints.test.ts
git commit -m "feat(ui-8a): pickHint pure function with 7 cascading rules"
```

---

### Task 2: `METRICS` definitions + unit tests

**Files:**
- Create: `lib/game/ui/metric-definitions.ts`
- Create: `tests/unit/game/ui/metric-definitions.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/game/ui/metric-definitions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { METRICS, type Tone } from "@/lib/game/ui/metric-definitions";
import type { GameState } from "@/lib/game/types";

function baseState(overrides: Partial<GameState["playerState"]> = {}): GameState {
  return {
    playerState: {
      companyName: "TestCo", cash: 100_000, mrr: 0, teamSize: 1,
      runwayMonths: 12, founderBurnout: 30, boardTension: 20, reputation: 50,
      products: [], investors: [], ...overrides,
    },
    scenario: { currentQuarter: "Q1", currentYear: 2005, totalTrimesters: 12 },
    worldState: { marketConditions: "neutral", competitors: [] },
    history: { trimestersPlayed: 0, activeConsequences: [] },
  } as GameState;
}

describe("METRICS shape", () => {
  it("has exactly 7 entries", () => {
    expect(METRICS).toHaveLength(7);
  });

  it("has unique IDs", () => {
    const ids = METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("includes the 7 expected ids", () => {
    const ids = METRICS.map((m) => m.id).sort();
    expect(ids).toEqual(["boardTension", "burnout", "cash", "mrr", "reputation", "runway", "team"]);
  });

  it("every metric has a non-empty label and tooltip", () => {
    for (const m of METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.tooltip.length).toBeGreaterThan(10);
    }
  });
});

describe("METRICS.tone", () => {
  function tone(id: string, state: GameState): Tone {
    const m = METRICS.find((x) => x.id === id);
    if (!m) throw new Error(`no metric ${id}`);
    return m.tone(state);
  }

  it("runway: 3 → crit (boundary)", () => {
    expect(tone("runway", baseState({ runwayMonths: 3 }))).toBe("crit");
  });
  it("runway: 4 → warn (between thresholds)", () => {
    expect(tone("runway", baseState({ runwayMonths: 4 }))).toBe("warn");
  });
  it("runway: 6 → neutral (lower bound of safe)", () => {
    expect(tone("runway", baseState({ runwayMonths: 6 }))).toBe("neutral");
  });

  it("burnout: 76 → warn (just above threshold)", () => {
    expect(tone("burnout", baseState({ founderBurnout: 76 }))).toBe("warn");
  });
  it("burnout: 91 → crit", () => {
    expect(tone("burnout", baseState({ founderBurnout: 91 }))).toBe("crit");
  });

  it("boardTension: 71 → warn", () => {
    expect(tone("boardTension", baseState({ boardTension: 71 }))).toBe("warn");
  });
  it("boardTension: 81 → crit", () => {
    expect(tone("boardTension", baseState({ boardTension: 81 }))).toBe("crit");
  });

  it("cash always neutral when positive", () => {
    expect(tone("cash", baseState({ cash: 100_000 }))).toBe("neutral");
  });

  it("mrr / team / reputation: always neutral", () => {
    const s = baseState();
    expect(tone("mrr", s)).toBe("neutral");
    expect(tone("team", s)).toBe("neutral");
    expect(tone("reputation", s)).toBe("neutral");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/unit/game/ui/metric-definitions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

`lib/game/ui/metric-definitions.ts`:

```ts
import type { GameState } from "@/lib/game/types";

export type Tone = "neutral" | "warn" | "crit" | "good";

export type MetricDef = {
  id: string;
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
    tooltip: "Argent en banque. Diminue chaque trimestre du burn (équipe × 10k + 5k overhead). Si à 0 → faillite.",
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
    tooltip: "Épuisement du fondateur (0-100). > 75 = décisions risquées plus dangereuses. > 90 = ousting risk.",
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/unit/game/ui/metric-definitions.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ui/metric-definitions.ts tests/unit/game/ui/metric-definitions.test.ts
git commit -m "feat(ui-8a): METRICS definitions with tone + tooltip + read fns"
```

---

### Task 3: `TUTORIAL_STEPS` data + unit tests

**Files:**
- Create: `lib/game/ui/tutorial-steps.ts`
- Create: `tests/unit/game/ui/tutorial-steps.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/game/ui/tutorial-steps.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TUTORIAL_STEPS } from "@/lib/game/ui/tutorial-steps";

describe("TUTORIAL_STEPS", () => {
  it("has exactly 6 steps", () => {
    expect(TUTORIAL_STEPS).toHaveLength(6);
  });

  it("steps have unique IDs", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("every step has a non-empty target selector, title, and body", () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.target.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it("step IDs match the expected canonical sequence", () => {
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual([
      "topbar-overall", "metric-runway", "narration", "tabs", "decisions", "advance",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/unit/game/ui/tutorial-steps.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

`lib/game/ui/tutorial-steps.ts`:

```ts
export type TutorialStep = {
  id: string;
  target: string;          // CSS selector matching a [data-tutorial-target="..."] node
  title: string;
  body: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "topbar-overall",
    target: "[data-tutorial-target='topbar']",
    title: "Ton tableau de bord",
    body: "Voici ta société, le trimestre courant et tes 7 indicateurs.",
  },
  {
    id: "metric-runway",
    target: "[data-tutorial-target='metric-runway']",
    title: 'La métrique "Piste"',
    body: "Compte à rebours avant la faillite. Surveille-la.",
  },
  {
    id: "narration",
    target: "[data-tutorial-target='narration']",
    title: "Le récit du trimestre",
    body: "Ce que le GM raconte. Le marché, les concurrents, les opportunités.",
  },
  {
    id: "tabs",
    target: "[data-tutorial-target='tabs']",
    title: "Les actions",
    body: "7 catégories d'actions. Choisis-en une, remplis le formulaire, ajoute au trimestre.",
  },
  {
    id: "decisions",
    target: "[data-tutorial-target='decisions']",
    title: "Tes décisions",
    body: "Tes choix s'accumulent ici jusqu'à ce que tu avances.",
  },
  {
    id: "advance",
    target: "[data-tutorial-target='advance']",
    title: "Avancer le trimestre",
    body: "Quand prêt, avance. Le GM applique tes décisions et raconte la suite.",
  },
];

export const TUTORIAL_FLAG_KEY = "vh_tutorial_seen_v1";
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/unit/game/ui/tutorial-steps.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ui/tutorial-steps.ts tests/unit/game/ui/tutorial-steps.test.ts
git commit -m "feat(ui-8a): TUTORIAL_STEPS data + localStorage flag key"
```

---

### Task 4: Theme tokens + font loading

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the contents of `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  /* Backgrounds & chrome */
  --color-base: #0a0e1a;
  --color-panel: #0f172a;
  --color-panel-elev: #1e293b;
  --color-border-subtle: #1e293b;
  --color-border-default: #334155;

  /* Text */
  --color-text-primary: #f1f5f9;
  --color-text-default: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-text-faint: #64748b;

  /* Semantic accents */
  --color-info: #3b82f6;
  --color-help: #818cf8;
  --color-advisor: #8b5cf6;
  --color-success: #10b981;
  --color-warn: #fb923c;
  --color-crit: #ef4444;
  --color-event: #f59e0b;
  --color-event-bg: #fbbf24;

  /* Fonts (variables are populated by next/font) */
  --font-sans: var(--font-inter), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
  --font-serif: "Charter", "Iowan Old Style", Georgia, serif;
}

html, body {
  background: var(--color-base);
  color: var(--color-text-default);
}
```

- [ ] **Step 2: Modify `app/layout.tsx` to load fonts**

Read the current file first (`Read` tool), then replace its contents with:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Venture Historia",
  description: "Sim narratif d'entrepreneuriat propulsé par Claude.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

If the existing `app/layout.tsx` already imports something else (favicon, providers, etc.), preserve those — only ensure (a) the two `next/font` imports + variable wiring on `<html>`, (b) `font-sans antialiased` on `<body>`, (c) the import of `./globals.css`.

- [ ] **Step 3: Run tsc + a smoke build to verify nothing crashes**

```bash
npx tsc --noEmit
```

Expected: clean exit.

```bash
rm -rf .next && npm run build
```

Expected: build succeeds. The font files download from Google during build (offline networks need the fonts pre-cached — if that's an issue, fall back to system stack and skip `next/font` for that font, but try first).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui-8a): @theme tokens (palette + fonts) + load Inter/JetBrains Mono"
```

---

### Task 5: `<Panel>` and `<Button>` primitives

**Files:**
- Create: `components/ui/panel.tsx`
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Create `<Panel>`**

`components/ui/panel.tsx`:

```tsx
import type { ReactNode } from "react";

type Variant = "default" | "narration" | "hint" | "advisor" | "alert";

const variantClasses: Record<Variant, string> = {
  default:   "bg-panel border-border-subtle",
  narration: "bg-panel border-border-subtle border-l-[3px] border-l-info",
  hint:      "bg-[rgba(99,102,241,0.06)] border-[#3730a3] border-l-[3px] border-l-help",
  advisor:   "bg-[rgba(139,92,246,0.05)] border-[#4c1d95]",
  alert:     "bg-[rgba(245,158,11,0.08)] border-event border-l-[3px] border-l-event",
};

export function Panel({
  title,
  badge,
  variant = "default",
  className = "",
  children,
}: {
  title?: string;
  badge?: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-md border p-3 ${variantClasses[variant]} ${className}`}>
      {(title || badge) && (
        <header className="mb-2 flex items-center justify-between">
          {title && (
            <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
              {title}
            </h2>
          )}
          {badge && (
            <span className="rounded-full bg-panel-elev px-2 py-0.5 text-[10px] tracking-wider text-text-muted">
              {badge}
            </span>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create `<Button>`**

`components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-text-primary text-base hover:opacity-90 disabled:opacity-50",
  secondary: "bg-panel-elev text-text-default border border-border-default hover:bg-border-default disabled:opacity-50",
  ghost:     "bg-transparent text-text-default border border-border-subtle hover:bg-panel-elev disabled:opacity-50",
  success:   "bg-success text-white hover:opacity-90 disabled:opacity-50",
  danger:    "bg-crit text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={`rounded-md font-medium transition ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    />
  );
}
```

- [ ] **Step 3: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add components/ui/panel.tsx components/ui/button.tsx
git commit -m "feat(ui-8a): Panel + Button design-system primitives"
```

---

### Task 6: `<Field>` and `<Tabs>` primitives

**Files:**
- Create: `components/ui/field.tsx`
- Create: `components/ui/tabs.tsx`

- [ ] **Step 1: Create `<Field>`**

`components/ui/field.tsx`:

```tsx
import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded border border-border-subtle bg-base px-2 py-1 text-sm text-text-default focus:border-info focus:outline-none"
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded border border-border-subtle bg-base px-2 py-1 text-sm text-text-default focus:border-info focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
```

- [ ] **Step 2: Create `<Tabs>`**

`components/ui/tabs.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${
              active
                ? "border border-info bg-[rgba(59,130,246,0.15)] text-text-primary"
                : "border border-border-subtle bg-transparent text-text-faint hover:text-text-default hover:border-border-default"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div role="tabpanel">{children}</div>;
}
```

- [ ] **Step 3: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add components/ui/field.tsx components/ui/tabs.tsx
git commit -m "feat(ui-8a): Field/TextInput/Select/Checkbox + Tabs primitives"
```

---

### Task 7: `<Tooltip>` and `<MetricCell>` primitives

**Files:**
- Create: `components/ui/tooltip.tsx`
- Create: `components/ui/metric-cell.tsx`

- [ ] **Step 1: Create `<Tooltip>`**

`components/ui/tooltip.tsx`:

```tsx
"use client";

import { useId, useState, type ReactNode } from "react";

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        className="cursor-help"
      >
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 w-60 rounded border border-border-default bg-panel-elev p-2.5 text-[11px] leading-[1.4] text-text-default shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Create `<MetricCell>`**

`components/ui/metric-cell.tsx`:

```tsx
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
```

- [ ] **Step 3: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add components/ui/tooltip.tsx components/ui/metric-cell.tsx
git commit -m "feat(ui-8a): Tooltip + MetricCell primitives"
```

---

### Task 8: `<ViewportGuard>` + wire into `(app)/layout`

**Files:**
- Create: `components/ui/viewport-guard.tsx`
- Modify: `app/(app)/layout.tsx` (read current, then patch as below)

- [ ] **Step 1: Create `<ViewportGuard>`**

`components/ui/viewport-guard.tsx`:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";

const MIN_WIDTH = 1280;

export function ViewportGuard({ children }: { children: ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="mb-3 text-2xl font-bold text-text-primary">
            Écran trop petit
          </h1>
          <p className="text-text-muted">
            Venture Historia se joue sur écran ≥ 1280&nbsp;px de large.
            <br />
            Reviens depuis un ordinateur.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Patch `app/(app)/layout.tsx`**

Read the current file. Wrap the entire returned tree (after the `if (!session?.user) redirect("/signin")` guard) inside `<ViewportGuard>`. Also restyle the `AUTH_DEV_BYPASS` banner to use the new tokens. The file should look like this when done:

```tsx
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { env } from "@/lib/env";
import Link from "next/link";
import { ViewportGuard } from "@/components/ui/viewport-guard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <ViewportGuard>
      <div className="min-h-screen">
        {env.AUTH_DEV_BYPASS && (
          <div className="bg-warn/15 border-b border-warn/40 text-warn px-6 py-1.5 text-center text-xs font-medium">
            ⚠ AUTH_DEV_BYPASS actif — toutes les requêtes utilisent
            <code className="mx-1 rounded bg-warn/20 px-1 font-mono">{session.user.email}</code>.
          </div>
        )}
        <header className="border-b border-border-subtle px-6 py-3">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between">
            <Link href="/dashboard" className="text-base font-semibold text-text-primary">
              Venture Historia
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted">{session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded border border-border-subtle px-2.5 py-1 text-xs text-text-default hover:bg-panel-elev"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-6">{children}</main>
      </div>
    </ViewportGuard>
  );
}
```

- [ ] **Step 3: Verify with tsc + a smoke build**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 4: Commit**

```bash
git add components/ui/viewport-guard.tsx app/\(app\)/layout.tsx
git commit -m "feat(ui-8a): ViewportGuard + restyle (app) layout chrome"
```

---

### Task 9: `<TopBar>` server component

**Files:**
- Create: `app/(app)/games/[gameId]/_components/top-bar.tsx`

- [ ] **Step 1: Create `<TopBar>`**

`app/(app)/games/[gameId]/_components/top-bar.tsx`:

```tsx
import { advanceTrimesterAction } from "../../actions";
import { MetricCell } from "@/components/ui/metric-cell";
import { METRICS } from "@/lib/game/ui/metric-definitions";
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
          <h1 className="text-base font-bold text-text-primary tracking-tight">{ps.companyName}</h1>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">
            {sc.currentQuarter} · {sc.currentYear} · T{trimNumber}/{sc.totalTrimesters}
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
        <button
          type="submit"
          data-tutorial-target="advance"
          className="rounded-md bg-success px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(16,185,129,0.3)] hover:opacity-90"
        >
          Avancer le trimestre →
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/games/\[gameId\]/_components/top-bar.tsx
git commit -m "feat(ui-8a): TopBar with metrics ribbon + Avancer form action"
```

---

### Task 10: `<ContextualHintPanel>` server component

**Files:**
- Create: `app/(app)/games/[gameId]/_components/contextual-hint-panel.tsx`

- [ ] **Step 1: Create the component**

`app/(app)/games/[gameId]/_components/contextual-hint-panel.tsx`:

```tsx
import { Panel } from "@/components/ui/panel";
import { pickHint } from "@/lib/game/ui/contextual-hints";
import { TutorialReplayButton } from "./tutorial-replay-button";
import type { GameState } from "@/lib/game/types";

export function ContextualHintPanel({ state }: { state: GameState }) {
  const hint = pickHint(state);
  const trimNumber = state.history.trimestersPlayed + 1;
  return (
    <Panel
      title="💡 Aide contextuelle"
      badge={`Trimestre ${trimNumber}`}
      variant="hint"
    >
      <div className="flex items-start justify-between gap-3">
        <p
          data-hint-id={hint.id}
          className="text-[12px] leading-[1.5] text-help"
        >
          {hint.message}
        </p>
        <TutorialReplayButton />
      </div>
    </Panel>
  );
}
```

> **Note:** This file imports `<TutorialReplayButton>` which is created in Task 16. Until then, tsc will fail. We commit Task 10 only after Task 16 lands. Skip the commit here — see Task 16 for the combined commit.

- [ ] **Step 2: (deferred — see Task 16 for the combined commit)**

---

### Task 11: Restyle four simple panels

**Files:**
- Modify: `app/(app)/games/[gameId]/_components/trimester-narration.tsx`
- Modify: `app/(app)/games/[gameId]/_components/decision-list.tsx`
- Modify: `app/(app)/games/[gameId]/_components/advisor-panel.tsx`
- Modify: `app/(app)/games/[gameId]/_components/event-modal.tsx`

- [ ] **Step 1: Replace `trimester-narration.tsx`**

```tsx
import { Panel } from "@/components/ui/panel";

export function TrimesterNarration({
  narrationOpening,
  quarterLabel,
}: {
  narrationOpening: string | null;
  quarterLabel: string;
}) {
  if (!narrationOpening) {
    return (
      <Panel title="Ouverture du trimestre" badge={quarterLabel} variant="narration">
        <p className="text-text-muted">Le trimestre n'a pas encore démarré.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Ouverture du trimestre" badge={quarterLabel} variant="narration">
      <p
        data-tutorial-target="narration"
        className="font-serif whitespace-pre-line text-[13.5px] leading-[1.6] text-text-default"
      >
        {narrationOpening}
      </p>
    </Panel>
  );
}
```

- [ ] **Step 2: Replace `decision-list.tsx`**

```tsx
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
```

- [ ] **Step 3: Replace `advisor-panel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { requestAdviceAction } from "../../actions";

export function AdvisorPanel({ gameId }: { gameId: string }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const askAdvisor = () => {
    setExpanded(true);
    startTransition(async () => {
      const text = await requestAdviceAction(gameId);
      setAdvice(text);
    });
  };

  return (
    <Panel title="🧙 Mentor IA" variant="advisor">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-[1.5] text-advisor">
          {advice && expanded && !isPending
            ? advice
            : "Conseil personnalisé sur l'état actuel."}
        </p>
        <div className="flex flex-shrink-0 gap-1.5">
          {expanded && advice ? (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Replier
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={askAdvisor}
            disabled={isPending}
            className="!bg-advisor !text-white"
          >
            {isPending ? "Réflexion…" : advice ? "💡 À nouveau" : "💡 Demander"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Replace `event-modal.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { chooseEventChoiceAction } from "../../actions";
import type { TrimesterEvent } from "@/lib/game/types";

export function EventModal({
  gameId,
  event,
}: {
  gameId: string;
  event: TrimesterEvent;
}) {
  const [isPending, startTransition] = useTransition();
  const choose = (choiceId: string) =>
    startTransition(() =>
      chooseEventChoiceAction({ gameId, eventId: event.id, choiceId }),
    );
  return (
    <Panel title="⚡ Événement" badge="Réagis" variant="alert">
      <p className="mb-3 text-[13px] leading-[1.5] text-text-default">{event.situation}</p>
      <div className="flex flex-col gap-2">
        {event.choices.map((c) => (
          <Button
            key={c.id}
            variant="secondary"
            size="md"
            disabled={isPending}
            onClick={() => choose(c.id)}
            className="!justify-start text-left !border-event/40 hover:!bg-event/10"
          >
            {c.label}
          </Button>
        ))}
      </div>
    </Panel>
  );
}
```

- [ ] **Step 5: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/games/\[gameId\]/_components/trimester-narration.tsx \
        app/\(app\)/games/\[gameId\]/_components/decision-list.tsx \
        app/\(app\)/games/\[gameId\]/_components/advisor-panel.tsx \
        app/\(app\)/games/\[gameId\]/_components/event-modal.tsx
git commit -m "feat(ui-8a): restyle 4 game-page panels via Panel/Button primitives"
```

---

### Task 12: Restyle action menu, action forms, NL escape form

**Files:**
- Modify: `app/(app)/games/[gameId]/_components/action-menu.tsx`
- Modify: `app/(app)/games/[gameId]/_components/action-forms.tsx`
- Modify: `app/(app)/games/[gameId]/_components/nl-escape-form.tsx`

- [ ] **Step 1: Replace `action-menu.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Panel } from "@/components/ui/panel";
import { ActionForms } from "./action-forms";
import type { GameState } from "@/lib/game/types";

const OPTIONS = [
  { id: "finance",  label: "💰 Finance" },
  { id: "team",     label: "👥 Équipe" },
  { id: "product",  label: "🚀 Produit" },
  { id: "market",   label: "📈 Marché" },
  { id: "strategy", label: "🤝 Stratégie" },
  { id: "nl",       label: "📝 Libre" },
  { id: "endgame",  label: "🏁 Sortie" },
] as const;

type Category = (typeof OPTIONS)[number]["id"];

export function ActionMenu({ gameId, state }: { gameId: string; state: GameState }) {
  const [active, setActive] = useState<Category>("finance");
  const activeLabel = OPTIONS.find((o) => o.id === active)!.label;

  return (
    <div className="flex flex-col gap-2.5">
      <div data-tutorial-target="tabs">
        <Tabs<Category>
          value={active}
          onChange={setActive}
          options={OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        />
      </div>
      <Panel title={activeLabel} variant="default">
        <ActionForms gameId={gameId} state={state} category={active} />
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Replace `action-forms.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Field, TextInput, Select, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { addDecisionAction, declarePlayerEndingAction } from "../../actions";
import type { Action, GameState } from "@/lib/game/types";
import { NlEscapeForm } from "./nl-escape-form";

type Category = "finance" | "team" | "product" | "market" | "strategy" | "nl" | "endgame";

export function ActionForms({
  gameId,
  state,
  category,
}: {
  gameId: string;
  state: GameState;
  category: Category;
}) {
  const [isPending, startTransition] = useTransition();
  const submit = (action: Action) =>
    startTransition(() => addDecisionAction({ gameId, action }));
  const submitEnding = (action: Action) =>
    startTransition(() => declarePlayerEndingAction({ gameId, action }));

  if (category === "finance") return <FinanceForms submit={submit} pending={isPending} />;
  if (category === "team")    return <TeamForms submit={submit} pending={isPending} />;
  if (category === "product") return <ProductForms submit={submit} pending={isPending} state={state} />;
  if (category === "market")  return <MarketForms submit={submit} pending={isPending} />;
  if (category === "strategy")return <StrategyForms submit={submit} pending={isPending} state={state} />;
  if (category === "nl")      return <NlEscapeForm gameId={gameId} />;
  return <EndgameForms submit={submitEnding} pending={isPending} />;
}

type SubmitProps = { submit: (a: Action) => void; pending: boolean };

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 mb-2.5">{children}</div>;
}

function FinanceForms({ submit, pending }: SubmitProps) {
  const [round, setRound] = useState<"seed" | "A" | "B" | "C">("seed");
  const [amount, setAmount] = useState("500000");
  const [equityPct, setEquityPct] = useState("15");
  const [investorName, setInvestorName] = useState("Northstar Capital");
  const [boardSeats, setBoardSeats] = useState("1");
  const [hasVeto, setHasVeto] = useState(false);
  const [allocCategory, setAllocCategory] = useState<"marketing" | "rd" | "ops">("marketing");
  const [allocAmount, setAllocAmount] = useState("10000");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Lever des fonds</h3>
        <Row>
          <Field label="Round"><Select value={round} onChange={(v) => setRound(v as "seed" | "A" | "B" | "C")} options={["seed", "A", "B", "C"] as const} /></Field>
          <Field label="Montant ($)"><TextInput value={amount} onChange={setAmount} /></Field>
          <Field label="Équité (%)"><TextInput value={equityPct} onChange={setEquityPct} /></Field>
        </Row>
        <Row>
          <Field label="Investisseur"><TextInput value={investorName} onChange={setInvestorName} /></Field>
          <Field label="Sièges board"><TextInput value={boardSeats} onChange={setBoardSeats} /></Field>
          <Field label="Veto"><Checkbox label="Droit de veto" checked={hasVeto} onChange={setHasVeto} /></Field>
        </Row>
        <Button
          variant="primary" size="sm" disabled={pending}
          onClick={() => submit({ kind: "finance.raiseFunds", round, amount: Number(amount), equityPct: Number(equityPct), investorName, boardSeats: Number(boardSeats), hasVeto })}
        >
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Allouer un budget</h3>
        <Row>
          <Field label="Catégorie"><Select value={allocCategory} onChange={(v) => setAllocCategory(v as "marketing" | "rd" | "ops")} options={["marketing", "rd", "ops"] as const} /></Field>
          <Field label="Montant ($)"><TextInput value={allocAmount} onChange={setAllocAmount} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "finance.allocateBudget", category: allocCategory, amount: Number(allocAmount) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function TeamForms({ submit, pending }: SubmitProps) {
  const [level, setLevel] = useState<"junior" | "senior" | "exec">("senior");
  const [salary, setSalary] = useState("120000");
  const [fireCount, setFireCount] = useState("1");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Embaucher</h3>
        <Row>
          <Field label="Niveau"><Select value={level} onChange={(v) => setLevel(v as "junior" | "senior" | "exec")} options={["junior", "senior", "exec"] as const} /></Field>
          <Field label="Salaire annuel ($)"><TextInput value={salary} onChange={setSalary} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "team.hire", level, salaryAnnual: Number(salary) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Licencier</h3>
        <Row>
          <Field label="Nombre"><TextInput value={fireCount} onChange={setFireCount} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "team.fire", count: Number(fireCount) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function ProductForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [name, setName] = useState("Nouveau produit");
  const [quarters, setQuarters] = useState("3");
  const [launchName, setLaunchName] = useState(state.playerState.products[0]?.name ?? "");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Démarrer R&amp;D</h3>
        <Row>
          <Field label="Nom"><TextInput value={name} onChange={setName} /></Field>
          <Field label="Trimestres"><TextInput value={quarters} onChange={setQuarters} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "product.startRD", productName: name, quartersUntilLaunch: Number(quarters) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Lancer un produit existant</h3>
        <Row>
          <Field label="Nom du produit"><TextInput value={launchName} onChange={setLaunchName} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "product.launch", productName: launchName })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function MarketForms({ submit, pending }: SubmitProps) {
  const [budget, setBudget] = useState("20000");
  const [pricingDelta, setPricingDelta] = useState("10");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Campagne marketing</h3>
        <Row>
          <Field label="Budget ($)"><TextInput value={budget} onChange={setBudget} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "market.campaign", budget: Number(budget) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Ajuster le pricing</h3>
        <Row>
          <Field label="Delta (%)"><TextInput value={pricingDelta} onChange={setPricingDelta} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "market.adjustPricing", deltaPct: Number(pricingDelta) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function StrategyForms({ submit, pending, state }: SubmitProps & { state: GameState }) {
  const [partner, setPartner] = useState("BigCo");
  const [revShare, setRevShare] = useState("10");
  const [competitorId, setCompetitorId] = useState(state.worldState.competitors[0]?.id ?? "");
  const [offer, setOffer] = useState("10000000");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Partenariat</h3>
        <Row>
          <Field label="Partenaire"><TextInput value={partner} onChange={setPartner} /></Field>
          <Field label="Rev share (%)"><TextInput value={revShare} onChange={setRevShare} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "strategy.partnership", partnerName: partner, revShare: Number(revShare) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Tenter une acquisition</h3>
        <Row>
          <Field label="Concurrent (id)"><TextInput value={competitorId} onChange={setCompetitorId} /></Field>
          <Field label="Offre ($)"><TextInput value={offer} onChange={setOffer} /></Field>
        </Row>
        <Button variant="primary" size="sm" disabled={pending} onClick={() => submit({ kind: "strategy.tryAcquire", competitorId, offerAmount: Number(offer) })}>
          {pending ? "…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}

function EndgameForms({ submit, pending }: SubmitProps) {
  const confirmEnd = (label: string, action: Action) => {
    if (typeof window !== "undefined" && !window.confirm(`Déclarer "${label}" termine la partie immédiatement. Continuer ?`)) return;
    submit(action);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">Déclarer une sortie termine la partie immédiatement.</p>
      <Button variant="success" size="md" disabled={pending} onClick={() => confirmEnd("IPO", { kind: "endgame.declareIPO" })}>🎉 IPO</Button>
      <Button variant="success" size="md" disabled={pending} onClick={() => confirmEnd("Acquisition", { kind: "endgame.acceptAcquisition", acquirerName: "BigCorp", price: 50_000_000 })}>🤝 Acquisition (BigCorp / $50M)</Button>
      <Button variant="secondary" size="md" disabled={pending} onClick={() => confirmEnd("Lifestyle business", { kind: "endgame.declareLifestyle" })}>🏡 Lifestyle business</Button>
      <Button variant="secondary" size="md" disabled={pending} onClick={() => confirmEnd("Conglomérat", { kind: "endgame.declareConglomerate" })}>👑 Conglomérat</Button>
    </div>
  );
}
```

- [ ] **Step 3: Replace `nl-escape-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { validateNlActionAction } from "../../actions";

type Verdict =
  | { kind: "idle" }
  | { kind: "accepted" }
  | { kind: "rejected"; reason: string };

export function NlEscapeForm({ gameId }: { gameId: string }) {
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setVerdict({ kind: "idle" });
    startTransition(async () => {
      const result = await validateNlActionAction({
        gameId,
        naturalLanguage: text,
      });
      if (result.ok) {
        setText("");
        setVerdict({ kind: "accepted" });
      } else {
        setVerdict({ kind: "rejected", reason: result.reason });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-muted">
        Tape une action en français. Le validateur l'interprète en action structurée si elle est légale.
      </p>
      <Field label="Action en langage naturel">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={isPending}
          placeholder="ex: j'embauche un CTO à 180k pour accélérer la R&D"
          className="w-full resize-y rounded border border-border-subtle bg-base p-2.5 text-sm text-text-default focus:border-info focus:outline-none disabled:opacity-50"
        />
      </Field>
      <Button
        variant="primary"
        size="md"
        onClick={submit}
        disabled={isPending || text.trim().length === 0}
      >
        {isPending ? "Validation…" : "Valider l'action"}
      </Button>
      {verdict.kind === "accepted" && (
        <p className="text-xs text-success">✓ Décision ajoutée au trimestre.</p>
      )}
      {verdict.kind === "rejected" && (
        <p className="text-xs text-crit">✗ {verdict.reason}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/games/\[gameId\]/_components/action-menu.tsx \
        app/\(app\)/games/\[gameId\]/_components/action-forms.tsx \
        app/\(app\)/games/\[gameId\]/_components/nl-escape-form.tsx
git commit -m "feat(ui-8a): restyle action menu/forms/NL via Tabs/Field/Button"
```

---

### Task 13: Rewrite game page + delete `metrics-header.tsx`

**Files:**
- Delete: `app/(app)/games/[gameId]/_components/metrics-header.tsx`
- Rewrite: `app/(app)/games/[gameId]/page.tsx`

> **Note:** `page.tsx` references `<TutorialOverlay>` and `<ContextualHintPanel>`. The first does not exist yet (Task 15). The second references `<TutorialReplayButton>` (Task 16). To keep this task self-contained but compilable, render the page WITHOUT `<TutorialOverlay>` for now — it's added in Task 17 in a separate commit. `<ContextualHintPanel>` is committed in Task 16 alongside its dependency. **This task imports `<ContextualHintPanel>` and tsc will fail until Task 16 lands.** Therefore: do Task 13 + 14 + 15 + 16 in sequence, run tsc once after Task 16, and commit the page rewrite as part of Task 16's combined commit. Steps below produce only the file content; the commit happens in Task 16.

- [ ] **Step 1: Delete `metrics-header.tsx`**

```bash
git rm app/\(app\)/games/\[gameId\]/_components/metrics-header.tsx
```

- [ ] **Step 2: Replace `page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadGame, loadTrimester } from "@/lib/game/persistence";
import { TopBar } from "./_components/top-bar";
import { TrimesterNarration } from "./_components/trimester-narration";
import { DecisionList } from "./_components/decision-list";
import { ContextualHintPanel } from "./_components/contextual-hint-panel";
import { ActionMenu } from "./_components/action-menu";
import { EventModal } from "./_components/event-modal";
import { AdvisorPanel } from "./_components/advisor-panel";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { gameId } = await params;
  const game = await loadGame(gameId);
  if (!game || game.userId !== session.user.id) notFound();
  if (game.status !== "in_progress") redirect(`/games/${gameId}/end`);

  const currentRow = await loadTrimester(gameId, game.currentTrimesterIndex);
  if (!currentRow) notFound();

  const opening = game.pendingOpening;
  const quarterLabel = `${currentRow.state.scenario.currentQuarter} · ${currentRow.state.scenario.currentYear}`;

  return (
    <div
      className="grid h-[calc(100vh-9rem)] grid-rows-[auto_1fr] gap-3"
      style={{ minHeight: 0 }}
    >
      <TopBar gameId={gameId} state={currentRow.state} />

      <div className="grid grid-cols-2 gap-3" style={{ minHeight: 0 }}>
        {/* LEFT */}
        <div className="flex flex-col gap-3 min-h-0">
          {opening?.event ? (
            <EventModal gameId={gameId} event={opening.event} />
          ) : (
            <TrimesterNarration
              narrationOpening={opening?.narrationOpening ?? null}
              quarterLabel={quarterLabel}
            />
          )}
          <DecisionList decisions={currentRow.decisions} />
          <ContextualHintPanel state={currentRow.state} />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <ActionMenu gameId={gameId} state={currentRow.state} />
          <AdvisorPanel gameId={gameId} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: (deferred — see Task 16 for the combined commit)**

---

### Task 14: `<TutorialOverlay>` client component

**Files:**
- Create: `app/(app)/games/[gameId]/_components/tutorial-overlay.tsx`

- [ ] **Step 1: Create the component**

`app/(app)/games/[gameId]/_components/tutorial-overlay.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { TUTORIAL_STEPS, TUTORIAL_FLAG_KEY } from "@/lib/game/ui/tutorial-steps";
import { Button } from "@/components/ui/button";

type Rect = { top: number; left: number; width: number; height: number } | null;

export function TutorialOverlay({ forceOpen = false }: { forceOpen?: boolean }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect>(null);
  const lastStepRef = useRef(0);

  // Mount decision: localStorage flag, unless forceOpen.
  useEffect(() => {
    if (forceOpen) {
      setActive(true);
      setStepIndex(0);
      return;
    }
    try {
      const seen = window.localStorage.getItem(TUTORIAL_FLAG_KEY);
      if (!seen) setActive(true);
    } catch {
      // localStorage unavailable — silently skip the tutorial.
    }
  }, [forceOpen]);

  // Compute spotlight rect when step changes.
  useEffect(() => {
    if (!active) return;
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;
    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, stepIndex]);

  // Esc to skip.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finish = () => {
    try {
      window.localStorage.setItem(TUTORIAL_FLAG_KEY, "true");
    } catch {
      // ignore
    }
    setActive(false);
  };

  const next = () => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      finish();
    } else {
      lastStepRef.current = stepIndex;
      setStepIndex(stepIndex + 1);
    }
  };
  const prev = () => setStepIndex(Math.max(0, stepIndex - 1));

  if (!active) return null;
  const step = TUTORIAL_STEPS[stepIndex];
  if (!step) return null;

  // Bubble position: below the spotlight rect, or centered if rect missing.
  const bubbleStyle = rect
    ? {
        top: rect.top + rect.height + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
        maxWidth: 300,
      }
    : { top: 80, left: 80, maxWidth: 300 };

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={`Tutoriel — étape ${stepIndex + 1} sur ${TUTORIAL_STEPS.length}`}
    >
      {/* Dim layer */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Spotlight ring */}
      {rect && (
        <div
          className="absolute rounded-md ring-2 ring-warn shadow-[0_0_30px_rgba(251,146,60,0.35)] pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Bubble */}
      <div
        className="absolute z-50 rounded-md bg-warn text-[#451a03] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        style={bubbleStyle}
      >
        <div className="p-3.5">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#92400e]">
            Étape {stepIndex + 1} sur {TUTORIAL_STEPS.length}
          </div>
          <h4 className="mb-1.5 text-[13px] font-bold">{step.title}</h4>
          <p className="mb-3 text-[12px] leading-[1.5]">{step.body}</p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-[10px] underline text-[#92400e] hover:text-[#451a03]"
            >
              Sauter le tutoriel
            </button>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={stepIndex === 0}
                className="!border-[#92400e] !text-[#451a03]"
              >
                ←
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={next}
                className="!bg-[#451a03] !text-warn"
              >
                {stepIndex === TUTORIAL_STEPS.length - 1 ? "Terminer" : "Suivant →"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 3: (deferred — combined commit in Task 16)**

---

### Task 15: `<TutorialReplayButton>` client component

**Files:**
- Create: `app/(app)/games/[gameId]/_components/tutorial-replay-button.tsx`

- [ ] **Step 1: Create the component**

`app/(app)/games/[gameId]/_components/tutorial-replay-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TUTORIAL_FLAG_KEY } from "@/lib/game/ui/tutorial-steps";
import { TutorialOverlay } from "./tutorial-overlay";

export function TutorialReplayButton() {
  const [replaying, setReplaying] = useState(false);

  const replay = () => {
    try {
      window.localStorage.removeItem(TUTORIAL_FLAG_KEY);
    } catch {
      // ignore
    }
    setReplaying(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={replay}
        className="flex-shrink-0 rounded border border-help/40 px-2 py-0.5 text-[10px] text-help hover:bg-help/10"
      >
        Revoir le tutoriel
      </button>
      {replaying && <TutorialOverlay forceOpen />}
    </>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 3: (deferred — combined commit in Task 16)**

---

### Task 16: Mount tutorial in page + combined commit for Tasks 10/13/14/15

**Files:**
- Modify: `app/(app)/games/[gameId]/page.tsx` (add `<TutorialOverlay />` mount)

- [ ] **Step 1: Re-edit `page.tsx` to mount the tutorial**

Add the import:

```tsx
import { TutorialOverlay } from "./_components/tutorial-overlay";
```

And render it at the end of the returned tree, **conditional on no active event** (so the overlay doesn't fight the event modal):

```tsx
return (
  <div className="grid h-[calc(100vh-9rem)] grid-rows-[auto_1fr] gap-3" style={{ minHeight: 0 }}>
    {/* … unchanged TopBar / body grid … */}
    {!opening?.event && <TutorialOverlay />}
  </div>
);
```

- [ ] **Step 2: Run the full test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc clean. Vitest reports 124+ tests / 25 files passing (was 103 / 22 before #8a; +21 from Tasks 1-3, +0 from chrome work).

- [ ] **Step 3: Combined commit for the page rewrite + tutorial wiring**

```bash
git add app/\(app\)/games/\[gameId\]/page.tsx \
        app/\(app\)/games/\[gameId\]/_components/contextual-hint-panel.tsx \
        app/\(app\)/games/\[gameId\]/_components/tutorial-overlay.tsx \
        app/\(app\)/games/\[gameId\]/_components/tutorial-replay-button.tsx
git status   # verify metrics-header.tsx is staged for deletion from Task 13
git commit -m "feat(ui-8a): rewrite game page (top bar + 50/50) + mount tutorial overlay"
```

If `metrics-header.tsx` is already deleted but not committed (because `git rm` from Task 13 didn't have a matching commit), it should be in the staged deletions for this commit. Verify with `git status` before committing.

---

### Task 17: Pre-set tutorial localStorage flag in existing E2E specs

**Files:**
- Modify: `tests/e2e/play-game.spec.ts`
- Modify: `tests/e2e/nl-and-advisor.spec.ts`

- [ ] **Step 1: Patch `tests/e2e/play-game.spec.ts`**

Insert the following just inside the `test()` callback, before the first `await page.goto`:

```ts
await page.addInitScript(() => {
  window.localStorage.setItem("vh_tutorial_seen_v1", "true");
});
```

The full test header should now look like:

```ts
test("create → take an action → advance → end via player-driven IPO", async ({ page }) => {
  page.on("dialog", (d) => d.accept());

  await page.addInitScript(() => {
    window.localStorage.setItem("vh_tutorial_seen_v1", "true");
  });

  await page.goto("/dashboard");
  // … rest unchanged
});
```

- [ ] **Step 2: Patch `tests/e2e/nl-and-advisor.spec.ts`**

Add a `beforeEach` inside the `describe`:

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("vh_tutorial_seen_v1", "true");
  });
});
```

- [ ] **Step 3: Run the existing E2E to confirm no regression**

```bash
pkill -f "next dev|next-server" 2>/dev/null; sleep 2
npm run test:e2e
```

Expected: 4 passed / 2 skipped — the same suite that was green pre-#8a.

If the play-game test fails because new selectors don't match (e.g., the company name is no longer rendered as a literal "NimbusCRM" string, or the locale-tolerant regex `/\$50[,\s ]000/` doesn't match the new format), update the assertion to match the new DOM. The new TopBar renders `NimbusCRM` literally in an `<h1>` and the cash metric is rendered by `MetricCell` as `$50,000` via `toLocaleString("en-US")` — both should match the existing selectors.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/play-game.spec.ts tests/e2e/nl-and-advisor.spec.ts
git commit -m "test(ui-8a): pre-set tutorial-seen flag in existing E2E specs"
```

---

### Task 18: New onboarding E2E spec

**Files:**
- Create: `tests/e2e/onboarding.spec.ts`

- [ ] **Step 1: Write the E2E tests**

`tests/e2e/onboarding.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const FLAG = "vh_tutorial_seen_v1";

test.describe("Onboarding — tutorial overlay, hints, tooltips", () => {
  test("first game shows tutorial overlay; clicking through finishes it", async ({ page }) => {
    // Fresh browser context — localStorage is empty by default; no addInitScript.
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Step 1 bubble is visible.
    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();

    // Click "Suivant →" 5 times to traverse steps 2-6.
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Suivant/ }).click();
    }
    // Final button is "Terminer" — click it to finish.
    await page.getByRole("button", { name: /Terminer/ }).click();

    // Overlay should be gone — no "Étape X sur 6" visible.
    await expect(page.getByText(/Étape \d sur 6/)).toHaveCount(0);

    // localStorage flag is set.
    const flag = await page.evaluate((k) => window.localStorage.getItem(k), FLAG);
    expect(flag).toBe("true");
  });

  test("tutorial does not reappear after dismissal (reload)", async ({ page }) => {
    // Pre-set the flag — simulating a returning user.
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toHaveCount(0);
  });

  test("'Sauter le tutoriel' dismisses immediately and sets the flag", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();
    await page.getByRole("button", { name: /Sauter le tutoriel/ }).click();
    await expect(page.getByText(/Étape \d sur 6/)).toHaveCount(0);

    const flag = await page.evaluate((k) => window.localStorage.getItem(k), FLAG);
    expect(flag).toBe("true");
  });

  test("metric tooltip appears on hover", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // Cash metric — locate by data attribute, hover the label, expect tooltip text.
    const cashCell = page.locator('[data-metric-id="cash"]');
    await cashCell.hover();
    await expect(page.getByText(/Argent en banque/)).toBeVisible();
  });

  test("contextual hint matches game state (SF 2005 → runway-critical)", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    // SF 2005 starts with runway = 3 months → rule 1 fires.
    const hint = page.locator('[data-hint-id="runway-critical"]');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(/Faillite imminente/);
  });

  test("'Revoir le tutoriel' replay button re-opens the overlay", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("vh_tutorial_seen_v1", "true");
    });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Démarrer/ }).first().click();
    await expect(page).toHaveURL(/\/games\/[^/]+$/);

    await expect(page.getByText(/Étape 1 sur 6/)).toHaveCount(0);
    await page.getByRole("button", { name: /Revoir le tutoriel/ }).click();
    await expect(page.getByText(/Étape 1 sur 6/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the new spec only**

```bash
pkill -f "next dev|next-server" 2>/dev/null; sleep 2
npm run test:e2e -- tests/e2e/onboarding.spec.ts
```

Expected: 6 passed.

If a test flakes on the tooltip hover (different OS rendering), Playwright's auto-retry on `expect` covers most timing issues; check the trace if any test fails.

- [ ] **Step 3: Run the full E2E suite to confirm no regressions**

```bash
npm run test:e2e
```

Expected: 10 passed + 2 skipped (4 from before + 6 new).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/onboarding.spec.ts
git commit -m "test(ui-8a): E2E coverage for tutorial overlay + hints + tooltips"
```

---

### Task 19: Final cross-cutting verification

**Files:** none

- [ ] **Step 1: Run all checks back-to-back**

```bash
npx tsc --noEmit
npm test
set -a && source .env.local && set +a
npm run test:integration
pkill -f "next dev|next-server" 2>/dev/null; sleep 2
npm run test:e2e
```

Expected:
- tsc clean
- ~124 unit tests / 25 files passing (was 103 / 22)
- 4 integration / 3 files passing (unchanged)
- 10 E2E passed / 2 skipped (was 4 / 2)

- [ ] **Step 2: Run a clean production build**

```bash
rm -rf .next && npm run build
```

Expected: build succeeds. Routes unchanged.

- [ ] **Step 3: Manual viewport check**

Start the dev server (`npm run dev`) and open `/games/[id]` for an existing game (or seed a new one).

Verify in a real Chromium-based browser:
1. Resize the window to **1440×900** → no vertical scroll, top bar + body 50/50 visible, all 7 metrics in the ribbon, Avancer button top-right.
2. Resize to **1280×800** → tolerable compression, still no scroll, still functional.
3. Resize to **800×600** → `<ViewportGuard>` shows the "Écran trop petit" placeholder.
4. Smoke-test the tutorial: clear `localStorage["vh_tutorial_seen_v1"]` in DevTools → reload → 6 steps reachable → "Sauter" works → "Revoir le tutoriel" reopens it.

- [ ] **Step 4: No commit needed**

The Plan #8a milestone is complete. The game page is redesigned, the tutorial + hints + tooltips ship, the design system primitives are ready for Plan #8b (dashboard + end screen).

---

## Self-Review

**Spec coverage check** (against `docs/superpowers/specs/2026-04-27-ui-redesign-8a-design.md`):

- ✅ §3 Visual Direction (palette, typography, density) → Task 4 (theme tokens + fonts) + Tasks 5-7 (primitives) + Tasks 11-12 (restyles)
- ✅ §4 Layout (top bar + 50/50, no-scroll grid) → Task 9 (TopBar) + Task 13 (page rewrite) + ViewportGuard from Task 8
- ✅ §5.1 Tutorial overlay (6 steps, localStorage, replay) → Tasks 3 (steps data) + 14 (overlay) + 15 (replay) + 16 (mount)
- ✅ §5.2 Contextual hint panel (7 cascading rules) → Task 1 (pickHint) + Task 10 (panel)
- ✅ §5.3 Metric tooltips (7 entries, tone) → Task 2 (METRICS) + Task 7 (Tooltip + MetricCell)
- ✅ §5.4 Tutorial replay → Task 15
- ✅ §6.1 Design-system primitives → Tasks 5-7 (Panel, Button, Field, Tabs, Tooltip, MetricCell) + Task 8 (ViewportGuard)
- ✅ §6.2 Pure logic modules → Tasks 1-3
- ✅ §6.3 Game page changes (rewrite page, restyle 7 components, delete metrics-header, restyle bypass banner) → Tasks 8 + 11 + 12 + 13 + 16
- ✅ §6.4 Out of scope — dashboard / end / signin / DB / IA / new deps — confirmed not modified by any task
- ✅ §8.1 Unit tests (~21) → Tasks 1-3 (9 + 13 + 4 = 26 actually; spec said ~21, plan delivers ~26 — over-delivers, fine)
- ✅ §8.2 E2E tests (6 new + 2 existing fixed) → Tasks 17 + 18
- ✅ §8.3 Integration unchanged — no integration tasks, suite stays at 4/3
- ✅ §8.4 Manual viewport check → Task 19 step 3
- ✅ §9 Acceptance criteria → Task 19 verifies every metric

**Placeholder scan**: no "TBD", no "implement later", no "TODO". A few "deferred — see Task N for the combined commit" markers (Tasks 10, 13, 14, 15) point forward to Task 16 — those are explicit cross-references, not placeholders, and Task 16 has the actual commit instructions.

**Type-consistency check**:
- `pickHint(state) → { id: string; message: string }` — same shape produced by Task 1, consumed by Task 10's `<ContextualHintPanel>` and asserted by Task 18's E2E (`data-hint-id` selector).
- `MetricDef` from Task 2 — `{ id, label, tooltip, read, tone }` consumed identically by Task 9's `<TopBar>`.
- `Tone` type — exported from Task 2's `metric-definitions.ts`, imported by Task 7's `<MetricCell>`.
- `TutorialStep` + `TUTORIAL_STEPS` + `TUTORIAL_FLAG_KEY` — all from Task 3, consumed by Task 14 (`TutorialOverlay`) and Task 15 (`TutorialReplayButton`).
- All `data-tutorial-target` attribute values match between Task 3 (`TUTORIAL_STEPS[].target` selector strings like `[data-tutorial-target='topbar']`) and the components that emit them: Task 9 (`topbar`, `metric-runway`, `advance`), Task 11 (`narration`, `decisions`), Task 12 (`tabs`).
- The `NlEscapeForm` rewrite in Task 12 preserves the `useTransition` `isPending` guard pattern fixed in commit 995e4b0 — the `submit` lock uses `isPending`, not the verdict state.
