# UI Redesign — Plan #8a Design Spec

**Date:** 2026-04-27
**Sub-project:** Plan #8a — Game Page Redesign + Onboarding
**Follow-up:** Plan #8b will redesign the dashboard and end screen using the same design system.

## 1. Context

After Plan #5 (Game UI MVP) and Plan #5b (NL escape + Advisor) shipped, the user reported the in-game experience as visually unappealing, monotonous, and hard to understand for a new player. Three concrete problems:

1. **Aesthetic** — uniform `rounded-lg border bg-neutral-900` panels; no hierarchy, no visual personality.
2. **Comprehension** — a new player lands on the game page with no explanation of mechanics, metrics, or how a trimester progresses.
3. **Layout** — six panels stacked vertically (`space-y-6`) force scrolling; the page reads as a flat list, not a coherent dashboard.

Plan #8a addresses all three for the game page itself. Plan #8b will extend the same design language to the dashboard and end screen so the whole authenticated app feels consistent.

## 2. Decisions (Brainstorming Recap)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Viewport target | Desktop large (≥ 1440×900). No mobile, no tablet support beyond a "viewport too small" placeholder under 1280px. |
| Q2 | Visual direction | Dashboard SaaS dense (deep navy + accent colors per category) **with a serif touch** for GM narration only. |
| Q3 | Onboarding | Guided tutorial overlay on first game **plus** persistent contextual hints panel + metric tooltips. |
| Q4 | Layout | Top bar (brand + 7 metrics + Avancer) + 50/50 body (left = narration / decisions / hint, right = action tabs / form / advisor). |
| Q5 | Scope | Game page + design system primitives now (#8a). Dashboard + end screen later (#8b). |
| Approach | Plan decomposition | Two plans: #8a self-contained for the game page, #8b reuses the primitives for the entry/exit pages. |

## 3. Visual Direction

### Palette

Background and chrome:
- `--bg-base`: `#0a0e1a` (page background — deep navy)
- `--bg-panel`: `#0f172a` (panel background)
- `--bg-panel-elev`: `#1e293b` (slightly raised — tooltip, badge, top bar gradient)
- `--border-subtle`: `#1e293b`
- `--border-default`: `#334155`
- `--text-primary`: `#f1f5f9`
- `--text-default`: `#e2e8f0`
- `--text-muted`: `#94a3b8`
- `--text-faint`: `#64748b`

Semantic accents:
- `--accent-info`: `#3b82f6` (narration, primary UI emphasis)
- `--accent-help`: `#818cf8` (contextual hint panel)
- `--accent-advisor`: `#8b5cf6` (advisor panel borders/text; the standard Tailwind violet-400/600 shades are used for hover/active states)
- `--accent-success`: `#10b981` (Avancer button, positive metric tone, accepted verdicts)
- `--accent-warn`: `#fb923c` (metric warning tone)
- `--accent-crit`: `#ef4444` (metric critical tone, rejected verdicts)
- `--accent-event`: `#f59e0b` (event modal border/accent; existing amber-500 background `#fbbf24` from current code is preserved as `--accent-event-bg`)

These are exposed as Tailwind v4 `@theme` tokens in `app/globals.css` and consumed via standard utilities (e.g., `bg-[--accent-info]` is replaced by `bg-info` after a custom `--color-info` token is defined).

### Typography

Three font stacks, each with a precise role:

- **Sans (Inter)** — UI default. Loaded via `next/font/google` from the root layout. Used for top bar, labels, buttons, form fields, tabs, metric values.
- **Serif (Charter / Iowan Old Style / Georgia, fallback chain only — no font download)** — exclusively for the GM narration text inside `<TrimesterNarration>`. The serif is the visual marker that "this is the story." Using the system stack avoids adding a 30-50KB font payload for one component.
- **Mono (JetBrains Mono)** — loaded via `next/font/google`. Used for the decision list (`finance.raiseFunds · seed · $500 000…`) and any technical/log-like values.

Tabular numerals (`font-variant-numeric: tabular-nums`) on metric values to prevent jitter as numbers update.

### Density

- Top bar: 7 metrics + brand + Avancer button on a single row, ~64px tall.
- Panels: 12-16px padding (vs. 24px today). Smaller is OK because the dark background already provides separation.
- Body: 12px gap between panels. The 50/50 split divides remaining vertical space among 3 left panels (narration ~50%, decisions ~25%, hint ~25%) and 3 right panels (tabs ~auto, form ~80%, advisor ~auto).

## 4. Layout

Single layout for the game page at viewport ≥ 1440×900. Below 1280px width, the page is replaced by a `<ViewportGuard>` placeholder ("Venture Historia se joue sur écran ≥ 1280px"). Between 1280–1440 the layout still works but the top-bar metrics may compress.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NimbusCRM · Q1 · 2005 · T1/12 │ Cash MRR Team Piste Burn Tens Rep │ Avancer→│
├──────────────────────────────────┬──────────────────────────────────────┤
│ ┌─ Ouverture du trimestre ────┐ │ [💰 Finance] [👥 Équipe] [🚀 Produit]│
│ │ <serif narration>           │ │ [📈 Marché] [🤝 Strat] [📝 Libre]    │
│ │                             │ │ [🏁 Sortie]                          │
│ │                             │ ├──────────────────────────────────────┤
│ └─────────────────────────────┘ │ ┌─ Lever des fonds (form actif) ───┐ │
│ ┌─ Décisions du trimestre (1)─┐ │ │ Round   Montant   Équité          │ │
│ │ → finance.raiseFunds…       │ │ │ Inv.    Sièges    Veto            │ │
│ └─────────────────────────────┘ │ │ [Ajouter au trimestre]            │ │
│ ┌─ 💡 Aide contextuelle ──────┐ │ └───────────────────────────────────┘ │
│ │ Lève des fonds tant que…    │ │ ┌─ 🧙 Mentor IA ─────────────────────┐ │
│ └─────────────────────────────┘ │ │ Conseil personnalisé. [Demander] │ │
│                                 │ └───────────────────────────────────┘ │
└──────────────────────────────────┴──────────────────────────────────────┘
```

Key invariants:

- **No vertical scroll** at 1440×900. The layout uses CSS grid (`grid-template-rows: auto 1fr`) for the page, then `flex` columns inside the body with `min-height: 0` to let internal panels shrink and overflow internally rather than push the page taller.
- **Avancer button is permanent** — top-right of the top bar, always visible. It's a `<form action={server-action}>` so it works without JS.
- **Narration overflows internally** if the GM text is long; the panel scrolls inside its own container.
- **Tabs are horizontal**, single row, all 7 visible. If a longer category is added in the future we'd switch to overflow-x scroll.

When an event is active (`pendingOpening.event !== null`), the narration panel is **replaced** in place by the event modal (amber border, choice buttons). It does NOT push the layout — it occupies the same slot.

## 5. Onboarding

Three coordinated mechanisms, all present from the first game forward.

### 5.1 First-game tutorial overlay

A client component `<TutorialOverlay>` rendered in `app/(app)/games/[gameId]/page.tsx`, gated on a localStorage flag.

**Trigger logic** (in the component):
1. On mount, read `localStorage.getItem("vh_tutorial_seen_v1")`.
2. If absent and we're on a game page, mount the overlay starting at step 1.
3. On "Suivant" past step 6 OR on "Sauter le tutoriel" → set the flag and unmount.

The flag is **versioned** (`_v1` suffix) so we can reset for all users by bumping to `_v2` if we redesign the tutorial later.

**The 6 steps** — each has `id`, `target` (CSS selector or React ref), `title`, `body`:

1. `topbar-overall` → top bar — *"Voici ta société, le trimestre courant et tes 7 indicateurs."*
2. `metric-runway` → "Piste" cell — *"Compte à rebours avant la faillite. Surveille-la."*
3. `narration` → narration panel — *"Le récit de ton trimestre. Le marché, les concurrents, les opportunités."*
4. `tabs` → action tabs — *"7 catégories d'actions. Choisis-en une, remplis le formulaire, ajoute au trimestre."*
5. `decisions` → decisions list — *"Tes décisions s'accumulent ici jusqu'à ce que tu avances."*
6. `advance` → Avancer button — *"Quand prêt, avance. Le GM applique tes décisions et raconte la suite."*

**Visuals**: full-page overlay at `rgba(0,0,0,0.65)`, the targeted element gets a CSS class that lifts it above the overlay (`position: relative; z-index: 10`) and a 2px ring (`box-shadow: 0 0 0 2px var(--accent-warn)`). The instruction bubble is amber (`bg-amber-300 text-amber-950`), positioned relative to the target with a CSS arrow.

**Accessibility**: `Esc` skips, focus is trapped inside the bubble, prev/next buttons have `aria-label`s.

### 5.2 Persistent contextual hint panel

A server component `<ContextualHintPanel>` rendered in the bottom slot of the left column. It runs the pure function `pickHint(state: GameState)` to choose the message.

**Cascading rules** (first match wins) — defined in `lib/game/ui/contextual-hints.ts`:

| Priority | Condition | Message ID | Message |
|---|---|---|---|
| 1 | `runwayMonths <= 3` | `runway-critical` | "Faillite imminente. Lève des fonds ou licencie immédiatement." |
| 2 | `founderBurnout > 75` | `burnout-high` | "Tu cours à l'épuisement. Évite les décisions risquées ce trimestre." |
| 3 | `boardTension > 70` | `board-hostile` | "Le board est à cran — un putsch est possible. Calme le jeu." |
| 4 | `runwayMonths < 6` | `runway-short` | "Ta piste est courte. Lève des fonds tant que c'est possible." |
| 5 | `trimestersPlayed === 0` | `first-trimester` | "Premier trimestre : pose les fondations (équipe, financement, premier produit)." |
| 6 | `products.filter(p => p.launched).length === 0 && trimestersPlayed >= 4` | `no-product-yet` | "Tu n'as encore rien lancé. Sans produit, pas de MRR." |
| 7 | (fallback) | `stable` | "État stable. Continue d'exécuter ton plan." |

The function returns `{ id: string; message: string }`. Both go into the rendered DOM (the `id` as `data-hint-id` for E2E selectors, the message visible to the user).

### 5.3 Metric tooltips

Each of the 7 top-bar metrics renders an `<MetricCell>` atom that includes a `<Tooltip>` triggered on hover or focus. Definitions live in `lib/game/ui/metric-definitions.ts`:

```ts
type Tone = "neutral" | "warn" | "crit" | "good";
type MetricDef = {
  id: string;
  label: string;
  tooltip: string;
  read: (s: GameState) => string;          // formatted display value
  tone: (s: GameState) => Tone;            // see rules below
};

export const METRICS: MetricDef[] = [
  { id: "cash",         label: "Cash",         tooltip: "Argent en banque. Diminue chaque trimestre du burn (équipe × 10k + 5k overhead). Si à 0 → faillite.", read, tone },
  { id: "mrr",          label: "MRR",          tooltip: "Revenu mensuel récurrent. Provient des produits lancés × utilisateurs × ARPU.",                          read, tone },
  { id: "team",         label: "Équipe",       tooltip: "Nombre de personnes. Chaque membre coûte ~10k$/trim et augmente la capacité d'exécution.",              read, tone },
  { id: "runway",       label: "Piste",        tooltip: "Mois restants avant faillite à burn constant. ≤ 3 = critique, < 6 = court.",                              read, tone },
  { id: "burnout",      label: "🔥 Burnout",   tooltip: "Épuisement du fondateur (0-100). > 75 = décisions risquées plus dangereuses. > 90 = ousting risk.",      read, tone },
  { id: "boardTension", label: "🪑 Tension",   tooltip: "Tension avec le board (0-100). > 70 = risque de putsch lors d'événements.",                              read, tone },
  { id: "reputation",   label: "Réputation",   tooltip: "Notoriété marché (0-100). Influence le succès des levées de fonds et acquisitions.",                    read, tone },
];
```

`tone(state: GameState): "neutral" | "warn" | "crit" | "good"` per metric. Exact thresholds:
- `runway`: `≤ 3 → crit`, `< 6 → warn`, `≥ 6 → neutral`.
- `burnout`: `> 90 → crit`, `> 75 → warn`, otherwise neutral.
- `boardTension`: `> 80 → crit`, `> 70 → warn`, otherwise neutral.
- `cash`: `< 0 → crit` (impossible at runtime but defensive), otherwise neutral.
- `mrr`, `team`, `reputation`: always `neutral` for MVP.

The tone drives the value's color via a CSS class.

### 5.4 Tutorial replay

A small `<TutorialReplayButton>` lives in the corner of the contextual hint panel ("Revoir le tutoriel"). Click → resets the localStorage flag and re-mounts the overlay at step 1. Useful for QA and for players who want a refresher.

## 6. Architecture

### 6.1 New design-system primitives

Created in `components/ui/`:

| File | Responsibility |
|------|----------------|
| `panel.tsx` | `<Panel title badge variant="default" \| "narration" \| "hint" \| "advisor" \| "alert">` — uniform border + header treatment, accepts arbitrary children |
| `metric.tsx` | `<MetricCell label value tone tooltip>` — single metric atom with tooltip |
| `tooltip.tsx` | `<Tooltip content>{trigger}</Tooltip>` — accessible, keyboard-friendly, no portal needed (positioned via CSS) |
| `field.tsx` | `<Field label hint>{input \| select}</Field>` — uniform labeled form field |
| `button.tsx` | `<Button variant="primary" \| "secondary" \| "ghost" \| "success" \| "danger" size="sm" \| "md">` |
| `tabs.tsx` | `<Tabs value onChange><TabList><Tab>…</TabList><TabPanel>…</TabPanel></Tabs>` — controlled |

These are intentionally small. We're not pulling in shadcn/ui or Radix — keeping it stdlib, no new deps, no theming layer.

### 6.2 Pure logic modules (testable)

| File | Export |
|------|--------|
| `lib/game/ui/contextual-hints.ts` | `pickHint(state: GameState): { id: string; message: string }` |
| `lib/game/ui/metric-definitions.ts` | `METRICS` array (7 entries) + `getMetricValue(state, id)` reader |
| `lib/game/ui/tutorial-steps.ts` | `TUTORIAL_STEPS` array (6 entries) |
| `lib/game/ui/viewport.ts` | `MIN_VIEWPORT_WIDTH = 1280` constant + nothing else for now |

### 6.3 Game page changes

| File | Action |
|------|--------|
| `app/globals.css` | **Modify** — add `@theme` block with palette + font tokens |
| `app/layout.tsx` | **Modify** — load Inter + JetBrains Mono via `next/font/google`, expose as CSS variables |
| `app/(app)/layout.tsx` | **Modify** — wrap children in `<ViewportGuard>`; restyle the `AUTH_DEV_BYPASS` banner to match new palette |
| `app/(app)/games/[gameId]/page.tsx` | **Rewrite** — new layout (top bar + 50/50 grid), mounts `<TutorialOverlay>` |
| `app/(app)/games/[gameId]/_components/top-bar.tsx` | **Create** — replaces `metrics-header.tsx`, includes Avancer button |
| `app/(app)/games/[gameId]/_components/metrics-header.tsx` | **Delete** |
| `app/(app)/games/[gameId]/_components/trimester-narration.tsx` | **Restyle** — wrap content in `<Panel variant="narration">`, apply serif class |
| `app/(app)/games/[gameId]/_components/decision-list.tsx` | **Restyle** — `<Panel>` + mono body |
| `app/(app)/games/[gameId]/_components/contextual-hint-panel.tsx` | **Create** — server component, calls `pickHint(state)` |
| `app/(app)/games/[gameId]/_components/action-menu.tsx` | **Restyle** — uses `<Tabs>` primitive |
| `app/(app)/games/[gameId]/_components/action-forms.tsx` | **Restyle** — uses `<Field>` + `<Button>` primitives |
| `app/(app)/games/[gameId]/_components/advisor-panel.tsx` | **Restyle** — uses `<Panel variant="advisor">` |
| `app/(app)/games/[gameId]/_components/event-modal.tsx` | **Restyle** — uses `<Panel variant="alert">`, kept amber palette |
| `app/(app)/games/[gameId]/_components/nl-escape-form.tsx` | **Restyle** — uses `<Field>` + `<Button>` |
| `app/(app)/games/[gameId]/_components/tutorial-overlay.tsx` | **Create** — client comp, manages localStorage + step navigation + spotlight + bubble |
| `app/(app)/games/[gameId]/_components/tutorial-replay-button.tsx` | **Create** — small button that resets the flag and re-triggers the overlay |
| `components/ui/viewport-guard.tsx` | **Create** — client component that watches `window.innerWidth` and renders a placeholder below 1280px |

### 6.4 Out of scope for #8a

- `app/(app)/dashboard/page.tsx` — kept as-is, will be redesigned in #8b
- `app/(app)/games/[gameId]/end/page.tsx` — kept as-is, redesigned in #8b
- `app/page.tsx` (landing) and `app/(auth)/signin/page.tsx` — not touched
- No DB schema changes
- No server-action changes (signature & behavior unchanged)
- No IA layer changes
- No new dependencies (no shadcn, no Radix, no Framer Motion)

## 7. Data Flow

The redesign is purely presentational — no new state lives on the server, no new server actions are created. Existing flows:

- `GameState` is loaded by `page.tsx` (server component) and passed down to `<TopBar state>`, `<TrimesterNarration narrationOpening>`, `<DecisionList decisions>`, `<ContextualHintPanel state>`, `<ActionMenu state>`, `<AdvisorPanel gameId>`. Same data, new chrome.
- `<TutorialOverlay>` is purely client-side state (current step + dismissed flag in localStorage).
- The `Avancer` form action remains `advanceTrimesterAction(gameId)` — moved from the bottom of the page into the top bar, but the same server action is invoked.

## 8. Testing Strategy

### 8.1 Unit tests (new)

| File | Tests | Subject |
|------|-------|---------|
| `tests/unit/game/ui/contextual-hints.test.ts` | ~8 | `pickHint(state)` — one test per cascade rule plus edge cases at thresholds (runway = 3 boundary, burnout = 75 boundary, etc.) and the fallback path |
| `tests/unit/game/ui/metric-definitions.test.ts` | ~10 | Shape of `METRICS` (7 entries, unique IDs) + `tone()` boundary tests for runway, burnout, boardTension |
| `tests/unit/game/ui/tutorial-steps.test.ts` | ~3 | 6 steps, IDs unique, ordering stable, target selectors are non-empty strings |

Total: ~21 new unit tests. No RTL, no component-level testing — that's enforced by repo convention (no existing component tests, no `@testing-library/react` dependency).

### 8.2 E2E tests

**New file** `tests/e2e/onboarding.spec.ts` (~6 tests, all under `MOCK_IA=true AUTH_DEV_BYPASS=true`):

1. **Tutorial appears on first game**: clear localStorage in `beforeEach` → start a new game → assert the step-1 bubble is visible → click "Suivant" 5 times → assert overlay no longer in DOM.
2. **Tutorial persists dismissal**: after test 1, reload the page → assert overlay does NOT appear.
3. **Skip button**: clear localStorage → start game → click "Sauter le tutoriel" → assert overlay gone, localStorage flag set.
4. **Metric tooltip**: hover over the "Cash" metric cell → assert the tooltip text "Argent en banque…" is visible.
5. **Contextual hint matches state**: SF 2005 starts at runway = 3 mo. With rule 1 thresholded at `<= 3`, assert the rule-1 message "Faillite imminente. Lève des fonds ou licencie immédiatement." is visible, AND that the panel's `data-hint-id` attribute equals `"runway-critical"`. The `data-hint-id` selector decouples the assertion from the exact French wording.
6. **Replay button**: with localStorage flag set, click "Revoir le tutoriel" → assert overlay reappears at step 1.

**Existing E2E to fix** (regression risk):

- `tests/e2e/play-game.spec.ts` — add `await page.addInitScript(() => localStorage.setItem("vh_tutorial_seen_v1", "true"))` before navigation in the test. Without this fix, the tutorial overlay would intercept clicks and the test would fail.
- `tests/e2e/nl-and-advisor.spec.ts` — same fix.

### 8.3 Integration tests

No changes. Plan #8a touches no DB, no server actions, no IA layer. Suite stays at 4 tests / 3 files.

### 8.4 Manual verification

Before marking the plan complete:
- Open `/games/[id]` at 1440×900 in a real browser → confirm zero vertical scroll.
- Resize to 1280×800 → tolerable compression, still no scroll, still functional.
- Resize to 800×600 → `<ViewportGuard>` placeholder visible.
- First-load smoke: tutorial overlay appears, all 6 steps are reachable, skip works, replay works.

## 9. Acceptance Criteria

- `npx tsc --noEmit` exits 0.
- `npm test` reports approximately 124 tests / 25 files passing (was 103 / 22; +21 from the 3 new logic-test files).
- `set -a && source .env.local && set +a && npm run test:integration` reports 4 / 3 (unchanged).
- `npm run test:e2e` reports 10 passed / 2 skipped (was 4 / 2; +6 onboarding tests).
- `rm -rf .next && npm run build` exits 0.
- Manual viewport check at 1440×900: no vertical scroll on `/games/[id]`.
- Tutorial localStorage flag (`vh_tutorial_seen_v1`) is set after first dismissal and respected on subsequent visits.

## 10. Sub-project boundary

**Plan #8a delivers a self-contained increment**: a new player, hitting `Démarrer` on the existing dashboard, lands on a redesigned game page, is taught the mechanics by the tutorial overlay, sees contextual hints during play, and can hover any metric for a definition. The dashboard and end screen continue to use the old style — there's a brief stylistic discontinuity at game start and game end, accepted as the cost of incremental delivery.

**Plan #8b** picks up with the design-system primitives created here (`<Panel>`, `<MetricCell>`, `<Button>`, `<Field>`, `<Tabs>`, `<Tooltip>`, the color/typography tokens) and applies them to:
- Dashboard: redesign the preset list as visually appealing cards, surface the active in-progress game prominently, restyle the games list.
- End screen: dramatize the climax with hero typography, a stat summary, a story-recap timeline, and clear "play again" affordances.
- The shared `<ViewportGuard>` from #8a covers the dashboard and end screen automatically (it's in the `(app)` layout).

After #8b ships, the entire authenticated app is consistent and the brief is fully addressed.

## 11. Risks

- **Tutorial overlay z-index battles.** Modals (event modal) need to render above the overlay if they're active. We resolve this by NOT mounting the tutorial overlay when `pendingOpening.event !== null` — i.e., the tutorial waits until the player has dismissed any active event. Documented in the plan as a constraint.
- **localStorage is per-browser.** A user who clears browser data or switches devices will see the tutorial again. Acceptable for MVP; a server-side flag on the `users` table is a future enhancement (#8c or later).
- **Serif fallback chain coverage.** Charter ships on macOS/iOS, Iowan Old Style on iOS, Georgia universally. Linux users without manually installed fonts will get Georgia, which still reads as "narration." This is an acceptable degradation.
- **Top-bar density at 1280px.** 7 metrics + brand + Avancer in 1280px is tight. We'll abbreviate labels (`Réputation` → `Rép`) at narrow widths via responsive utility classes. Verified manually before merge.
- **Existing E2E selectors.** The play-game E2E uses text selectors like `getByText("NimbusCRM")` and `getByText("Q1 2005")` — those should survive the redesign as long as the brand and quarter text are still rendered. The selector for "Avancer le trimestre" must match the new button text exactly. The plan task list calls out which selectors to preserve.
