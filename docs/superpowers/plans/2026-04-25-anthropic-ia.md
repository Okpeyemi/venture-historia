# Real IA Integration (Anthropic Claude) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `MockGameMaster`, `MockValidator`, and `MockAdvisor` with real Anthropic Claude implementations that compose seamlessly into the existing engine and `ScriptedGameMaster`. Ship a `ia_call_log` table to record per-call cost (groundwork for Plan #7 credits). All tests stub the SDK — no real API calls in CI.

**Architecture:** Each agent is a separate class implementing the existing `IGameMaster` / `IValidator` / `IAdvisor` interface from Plan #2. They share a small `lib/game/ia/anthropic/client.ts` that wraps the SDK with retry/backoff and a `state-serializer.ts` that produces the compact JSON injected into prompts. Anthropic's prompt caching (`cache_control: ephemeral`) keeps the system prompt + scenario lore cached across the open/close roundtrip within a trimester. Structured output uses Anthropic tool use so the engine never has to parse free-form JSON. After each call, `recordIaCall()` writes a row to `ia_call_log`.

**Tech Stack:** `@anthropic-ai/sdk` (latest), Drizzle ORM (one new table), Vitest with `vi.mock` for SDK stubs. Single model in MVP — `claude-sonnet-4-6` for everything. Per-feature tier selection (Haiku for Validator, Opus for endings) lands in Plan #7 alongside credits.

---

## Scope

**In scope:**
- `@anthropic-ai/sdk` installed; `ANTHROPIC_API_KEY` validated in `lib/env.ts`
- New table `ia_call_log` (gameId nullable, trimesterIndex nullable, agentRole, model, inputTokensTotal, inputTokensCached, outputTokens, costUsd, createdAt) + migration
- Pure helper `pricingForModel(model) → { inputPerMTok, outputPerMTok, cachedInputPerMTok }` and `calcCostUsd(usage, model) → number`
- `recordIaCall(args)` persistence helper
- `lib/game/ia/anthropic/client.ts` — SDK factory + retry-with-backoff wrapper for transient errors (5xx, rate limits) up to 3 attempts
- `lib/game/ia/anthropic/state-serializer.ts` — compact `serializeForPrompt(state) → string` (JSON, no whitespace)
- `AnthropicGameMaster` (`lib/game/ia/anthropic/game-master.ts`) — implements `IGameMaster` using a single tool call per turn (`apply_trimester_open` / `apply_trimester_close`)
- `AnthropicValidator` (`lib/game/ia/anthropic/validator.ts`) — implements `IValidator`; tool call `validate_action` returns either `{accepted:true, action:Action}` or `{accepted:false, reason:string}`
- `AnthropicAdvisor` (`lib/game/ia/anthropic/advisor.ts`) — implements `IAdvisor`; plain-text completion (no tool needed)
- `ScriptedGameMaster` constructor signature already takes an `inner: IGameMaster` (from Plan #3) — `AnthropicGameMaster` plugs in unchanged
- Unit tests for each class with `vi.mock("@anthropic-ai/sdk")` returning canned responses
- One integration test that uses a stubbed SDK to verify the cost log fills correctly across a 3-trimester playthrough

**Out of scope (later plans):**
- HTTP API routes / UI to invoke Validator and Advisor (Plan #5)
- Per-feature model tier selection by the player (Plan #7 — exposed via UI alongside credits)
- Mentor persistant (Phase 2 — replaces Advisor with a stateful chat)
- Sliding-window compression of `history.narrativeSummary` (Plan #6 — needed once games run long enough for context bloat)
- Streaming responses (UX optimization for Plan #5)
- Prompt quality iteration (continuous — out of scope for any single plan; this plan ships a *correct* baseline, not an optimal one)
- Model fallback (e.g., Sonnet → Haiku on rate limit) — defer until cost or rate pressure is real
- Multi-language prompts (system prompts default to French to match the SF 2005 preset content)

---

## File Structure

```
venture-historia/
├── package.json                                       # MODIFY — add @anthropic-ai/sdk
├── lib/
│   ├── env.ts                                         # MODIFY — validate ANTHROPIC_API_KEY
│   ├── db/
│   │   └── schema.ts                                  # MODIFY — add iaCallLog table
│   └── game/
│       ├── ia/
│       │   ├── types.ts                               # UNCHANGED — interfaces from Plan #2
│       │   ├── mock.ts                                # UNCHANGED — still used in unit tests
│       │   └── anthropic/                             # ALL NEW
│       │       ├── client.ts                          # CREATE — SDK factory + retry
│       │       ├── pricing.ts                         # CREATE — pricingForModel + calcCostUsd
│       │       ├── cost-log.ts                        # CREATE — recordIaCall persistence
│       │       ├── state-serializer.ts                # CREATE — compact serialize for prompt
│       │       ├── prompts.ts                         # CREATE — system prompts (constants)
│       │       ├── game-master.ts                     # CREATE — AnthropicGameMaster
│       │       ├── validator.ts                       # CREATE — AnthropicValidator
│       │       └── advisor.ts                         # CREATE — AnthropicAdvisor
│
├── drizzle/                                           # GENERATED — new migration
│
├── tests/
│   ├── unit/
│   │   └── game/
│   │       └── ia/
│   │           └── anthropic/                         # ALL NEW
│   │               ├── pricing.test.ts
│   │               ├── state-serializer.test.ts
│   │               ├── game-master.test.ts
│   │               ├── validator.test.ts
│   │               └── advisor.test.ts
│   └── integration/
│       └── game/
│           └── anthropic-playthrough.test.ts          # CREATE — 3 trimesters with stubbed SDK
│
├── .env.example                                       # MODIFY — document ANTHROPIC_API_KEY
└── README.md                                          # MODIFY — note Anthropic key requirement
```

**File responsibilities:**
- `lib/game/ia/anthropic/client.ts` — single source of the Anthropic client. Owns retry/backoff. Other modules `import { anthropicClient } from "./client"` and never instantiate the SDK directly.
- `lib/game/ia/anthropic/pricing.ts` — pure: model name → per-MTok prices, plus `calcCostUsd(usage, model)`. No DB, no SDK.
- `lib/game/ia/anthropic/cost-log.ts` — only place that writes `iaCallLog` rows. Translates SDK usage into a row.
- `lib/game/ia/anthropic/state-serializer.ts` — pure: `GameState` → compact JSON string. No omissions; the model sees everything.
- `lib/game/ia/anthropic/prompts.ts` — pure: exports system-prompt strings and tool definitions as constants. Easy to grep / iterate on.
- `lib/game/ia/anthropic/game-master.ts` — `AnthropicGameMaster` class implementing `IGameMaster`. Composes `client` + `prompts` + `state-serializer` + `cost-log`. Optional `inner: IGameMaster` constructor arg defaults to `new MockGameMaster()` so deterministic state pipeline (action processing, burnout, time advance) stays deterministic — Anthropic only generates narration + opening event.
- Same composition pattern for `validator.ts` and `advisor.ts`.

---

## Tasks

### Task 1: Install SDK + extend env loader

**Files:**
- Modify: `package.json`, `package-lock.json`, `lib/env.ts`, `tests/unit/env.test.ts`, `.env.example`

- [ ] **Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

After install, **pin the exact version** in `package.json` (drop the caret) for reproducibility — the SDK has been moving fast. Edit `package.json` to replace `"@anthropic-ai/sdk": "^X.Y.Z"` with `"@anthropic-ai/sdk": "X.Y.Z"` (whatever version was just installed).

- [ ] **Step 2: Extend `tests/unit/env.test.ts`** — add ANTHROPIC_API_KEY assertions

In the existing `it("returns a typed env object when all vars are set", ...)` test, add an `ANTHROPIC_API_KEY` stub line and an assertion. Update it to:

```ts
  it("returns a typed env object when all vars are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_URL).toBe("postgres://u:p@localhost:5432/db");
    expect(env.AUTH_GOOGLE_ID).toBe("id");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test-key");
  });
```

Also extend ALL other passing tests in this file (the AUTH_SECRET min-length test, the NODE_ENV defaults test, the AUTH_DEV_BYPASS tests) to also stub `ANTHROPIC_API_KEY: "sk-ant-test-key"` before importing `@/lib/env` — otherwise they will start failing because the new required field is missing.

Add a new test specifically for the missing case, immediately after the existing "throws when DATABASE_URL is missing" test:

```ts
  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(import("@/lib/env")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
```

- [ ] **Step 3: Run tests — must fail**

Run: `npm test`
Expected: most existing env tests fail with "ANTHROPIC_API_KEY: Required" (because we just added the field as required) — that's the failing baseline TDD requires.

- [ ] **Step 4: Add ANTHROPIC_API_KEY to `lib/env.ts`**

In `lib/env.ts`, add `ANTHROPIC_API_KEY: z.string().min(1),` to the schema, between `AUTH_GOOGLE_SECRET` and the `NODE_ENV` block. Final schema fields:

```ts
    DATABASE_URL: z.string().url().min(1),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    // ... existing NODE_ENV and AUTH_DEV_BYPASS blocks unchanged ...
```

- [ ] **Step 5: Run tests — must pass**

Run: `npm test`
Expected: all env tests pass (the existing ones now stub ANTHROPIC_API_KEY too, the new "throws when missing" passes).

- [ ] **Step 6: Update `.env.example`**

Add a new section to `.env.example`:

```
# Anthropic — get a key from https://console.anthropic.com/settings/keys
# Required at boot. Plan #4 wires Claude into the game master, validator,
# and advisor agents.
ANTHROPIC_API_KEY=
```

- [ ] **Step 7: Add ANTHROPIC_API_KEY to your local `.env.local`** (manual)

Edit `/home/darellchooks/Bureau/venture-historia/.env.local` and add a line:

```
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

If you don't have a real key, use `sk-ant-placeholder-for-now` — tests don't actually call the API (they mock it), and the dev server won't crash without it as long as you set *some* string.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json lib/env.ts tests/unit/env.test.ts .env.example
git commit -m "feat(ia): install Anthropic SDK + require ANTHROPIC_API_KEY"
```

---

### Task 2: DB schema — `iaCallLog` table + migration

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Append the new table to `lib/db/schema.ts`**

At the bottom of `lib/db/schema.ts` (after the existing `trimesters` table), add:

```ts
export const iaCallLog = pgTable("iaCallLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // gameId nullable: validator/advisor calls can happen outside a game
  // context (e.g. preset preview). When set, references games(id).
  gameId: text("gameId").references(() => games.id, { onDelete: "cascade" }),
  trimesterIndex: integer("trimesterIndex"),
  agentRole: text("agentRole", {
    enum: ["game_master_open", "game_master_close", "validator", "advisor"],
  }).notNull(),
  model: text("model").notNull(),
  inputTokensTotal: integer("inputTokensTotal").notNull(),
  inputTokensCached: integer("inputTokensCached").notNull().default(0),
  outputTokens: integer("outputTokens").notNull(),
  costUsd: text("costUsd").notNull(), // stored as string to avoid float drift; format "0.012345"
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Generate the migration**

```bash
set -a && source .env.local && set +a
npm run db:generate
```

Expected: a new file `drizzle/0002_*.sql` with `CREATE TABLE "iaCallLog"` + the FK to `games`.

- [ ] **Step 3: Apply the migration**

```bash
set -a && source .env.local && set +a
npm run db:migrate
```

Expected: migration applies cleanly.

- [ ] **Step 4: Verify the table exists**

```bash
docker compose exec postgres psql -U venture -d venture_historia -c "\dt"
```

Expected: 7 tables in `public` (the 4 auth + game + trimester + iaCallLog).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(ia): add iaCallLog table and migration"
```

---

### Task 3: Pricing helper

**Files:**
- Create: `lib/game/ia/anthropic/pricing.ts`, `tests/unit/game/ia/anthropic/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/ia/anthropic/pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pricingForModel, calcCostUsd } from "@/lib/game/ia/anthropic/pricing";

describe("pricingForModel", () => {
  it("returns Sonnet 4.6 prices in $/MTok", () => {
    const p = pricingForModel("claude-sonnet-4-6");
    expect(p.inputPerMTok).toBe(3);
    expect(p.outputPerMTok).toBe(15);
    expect(p.cachedInputPerMTok).toBe(0.3);
  });

  it("returns Haiku 4.5 prices", () => {
    const p = pricingForModel("claude-haiku-4-5-20251001");
    expect(p.inputPerMTok).toBe(1);
    expect(p.outputPerMTok).toBe(5);
  });

  it("returns Opus 4.7 prices", () => {
    const p = pricingForModel("claude-opus-4-7");
    expect(p.inputPerMTok).toBe(15);
    expect(p.outputPerMTok).toBe(75);
  });

  it("throws on unknown model", () => {
    expect(() => pricingForModel("claude-unknown")).toThrow(/unknown model/i);
  });
});

describe("calcCostUsd", () => {
  it("computes (input - cached) * inputRate + cached * cachedRate + output * outputRate", () => {
    // Sonnet: 1000 input total, 200 cached, 500 output
    // = (1000 - 200) * 3/1e6 + 200 * 0.3/1e6 + 500 * 15/1e6
    // = 0.0024 + 0.00006 + 0.0075
    // = 0.00996
    const cost = calcCostUsd(
      { inputTokensTotal: 1000, inputTokensCached: 200, outputTokens: 500 },
      "claude-sonnet-4-6",
    );
    expect(cost).toBeCloseTo(0.00996, 6);
  });

  it("returns 0 for zero usage", () => {
    expect(
      calcCostUsd(
        { inputTokensTotal: 0, inputTokensCached: 0, outputTokens: 0 },
        "claude-sonnet-4-6",
      ),
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL, "Failed to resolve import @/lib/game/ia/anthropic/pricing".

- [ ] **Step 3: Implement `lib/game/ia/anthropic/pricing.ts`**

```ts
export type AnthropicModel =
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-7";

export type ModelPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok: number;
};

const PRICING: Record<AnthropicModel, ModelPricing> = {
  // USD per million tokens. Update when Anthropic revises pricing.
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15, cachedInputPerMTok: 0.3 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 1, outputPerMTok: 5, cachedInputPerMTok: 0.1 },
  "claude-opus-4-7": { inputPerMTok: 15, outputPerMTok: 75, cachedInputPerMTok: 1.5 },
};

export function pricingForModel(model: string): ModelPricing {
  const p = PRICING[model as AnthropicModel];
  if (!p) throw new Error(`unknown model: ${model}`);
  return p;
}

export type Usage = {
  inputTokensTotal: number;
  inputTokensCached: number;
  outputTokens: number;
};

export function calcCostUsd(usage: Usage, model: string): number {
  const p = pricingForModel(model);
  const uncachedInput = Math.max(0, usage.inputTokensTotal - usage.inputTokensCached);
  return (
    (uncachedInput * p.inputPerMTok) / 1_000_000 +
    (usage.inputTokensCached * p.cachedInputPerMTok) / 1_000_000 +
    (usage.outputTokens * p.outputPerMTok) / 1_000_000
  );
}
```

- [ ] **Step 4: Run — must pass**

Expected: 6 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ia/anthropic/pricing.ts tests/unit/game/ia/anthropic/pricing.test.ts
git commit -m "feat(ia): pricing model + cost calculation"
```

---

### Task 4: Cost log helper

**Files:**
- Create: `lib/game/ia/anthropic/cost-log.ts`

No unit test — covered by integration test in Task 11.

- [ ] **Step 1: Implement `lib/game/ia/anthropic/cost-log.ts`**

```ts
import { db } from "@/lib/db/client";
import { iaCallLog } from "@/lib/db/schema";
import { calcCostUsd, type Usage } from "./pricing";

export type AgentRole = "game_master_open" | "game_master_close" | "validator" | "advisor";

export async function recordIaCall(args: {
  gameId: string | null;
  trimesterIndex: number | null;
  agentRole: AgentRole;
  model: string;
  usage: Usage;
}): Promise<void> {
  const costUsd = calcCostUsd(args.usage, args.model);
  await db.insert(iaCallLog).values({
    gameId: args.gameId,
    trimesterIndex: args.trimesterIndex,
    agentRole: args.agentRole,
    model: args.model,
    inputTokensTotal: args.usage.inputTokensTotal,
    inputTokensCached: args.usage.inputTokensCached,
    outputTokens: args.usage.outputTokens,
    costUsd: costUsd.toFixed(6), // 6-decimal precision, store as string
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/ia/anthropic/cost-log.ts
git commit -m "feat(ia): cost-log helper records iaCallLog rows"
```

---

### Task 5: Anthropic client factory + retry

**Files:**
- Create: `lib/game/ia/anthropic/client.ts`

No unit test for the client itself — exercised through the agent tests (Tasks 7-10).

- [ ] **Step 1: Implement `lib/game/ia/anthropic/client.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

// Cache the client across HMR reloads in dev — same pattern as lib/db/client.ts.
const globalForAnthropic = globalThis as unknown as {
  anthropic?: Anthropic;
};

export const anthropicClient: Anthropic =
  globalForAnthropic.anthropic ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

if (env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropicClient;
}

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

/**
 * Retry transient failures (5xx, 429) with exponential backoff. Non-transient
 * errors (4xx other than 429, validation, invalid API key) propagate.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      const isTransient = isTransientAnthropicError(err);
      if (!isTransient || attempt >= maxAttempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function isTransientAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; name?: string };
  if (e.status === 429) return true;
  if (typeof e.status === "number" && e.status >= 500 && e.status < 600) return true;
  if (e.name === "APIConnectionError" || e.name === "APIConnectionTimeoutError") return true;
  return false;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/ia/anthropic/client.ts
git commit -m "feat(ia): Anthropic client factory + retry-with-backoff helper"
```

---

### Task 6: State serializer

**Files:**
- Create: `lib/game/ia/anthropic/state-serializer.ts`, `tests/unit/game/ia/anthropic/state-serializer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/ia/anthropic/state-serializer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeForPrompt } from "@/lib/game/ia/anthropic/state-serializer";
import { createInitialState } from "@/lib/game/state";

const baseState = () =>
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

describe("serializeForPrompt", () => {
  it("emits compact JSON (no whitespace) parseable round-trip", () => {
    const json = serializeForPrompt(baseState());
    expect(json).not.toContain("  ");
    expect(json).not.toContain("\n");
    const parsed = JSON.parse(json);
    expect(parsed.playerState.companyName).toBe("TestCo");
    expect(parsed.playerState.cash).toBe(100_000);
    expect(parsed.scenario.currentQuarter).toBe("Q1");
  });

  it("includes all four top-level state sections", () => {
    const json = serializeForPrompt(baseState());
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort()).toEqual(["history", "playerState", "scenario", "worldState"]);
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/ia/anthropic/state-serializer.ts`**

```ts
import type { GameState } from "@/lib/game/types";

/**
 * Compact JSON for prompt injection. No whitespace = fewer tokens.
 * The full state is included — Plan #6 will add a sliding-window
 * history compression once games run long enough for context bloat.
 */
export function serializeForPrompt(state: GameState): string {
  return JSON.stringify(state);
}
```

- [ ] **Step 4: Run — must pass**

Expected: 2 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ia/anthropic/state-serializer.ts tests/unit/game/ia/anthropic/state-serializer.test.ts
git commit -m "feat(ia): state serializer for prompt injection"
```

---

### Task 7: System prompts as constants

**Files:**
- Create: `lib/game/ia/anthropic/prompts.ts`

No test — pure data. Exercised by Tasks 8-10.

- [ ] **Step 1: Implement `lib/game/ia/anthropic/prompts.ts`**

```ts
// System prompts and tool definitions for each agent. Kept here as
// constants so prompt iteration is grep-friendly and reviewable.

export const GAME_MASTER_SYSTEM = `Tu es le Game Master narratif de Venture Historia, un sim entrepreneurial.
Ton rôle: narrer l'évolution d'une entreprise à travers ses trimestres,
en français, dans un ton réaliste et immersif. Tu reçois l'état complet
du jeu en JSON et dois produire une narration cohérente avec cet état.

Règles strictes:
- Respecte les chiffres de l'état (cash, équipe, MRR, etc.) — ne les
  invente jamais.
- Mentionne les concurrents nommés du worldState quand c'est pertinent.
- Reste fidèle à l'époque et au secteur du scénario.
- Ne suggère jamais d'actions au joueur — c'est le rôle de l'Advisor.
- Pour les événements, génère 3-4 choix réalistes mutuellement exclusifs.

Tu communiques exclusivement via les outils fournis (apply_trimester_open
ou apply_trimester_close). N'écris jamais de texte hors tool call.`;

export const VALIDATOR_SYSTEM = `Tu es le Validator de Venture Historia. Le joueur a écrit une action en
langage naturel pour son entreprise. Ta tâche: traduire cette action en
une Action structurée si elle est légale (cash dispo, fait sens dans le
contexte du jeu), sinon la rejeter avec une raison claire.

Les Action.kind possibles sont:
- finance.raiseFunds, finance.allocateBudget
- team.hire, team.fire
- product.startRD, product.launch
- market.campaign, market.adjustPricing
- strategy.partnership, strategy.tryAcquire
- endgame.declareIPO, endgame.acceptAcquisition, endgame.declareLifestyle, endgame.declareConglomerate

Tu communiques exclusivement via l'outil validate_action.`;

export const ADVISOR_SYSTEM = `Tu es l'Advisor de Venture Historia, un mentor business expérimenté.
Le joueur dirige une entreprise et te demande conseil sur sa situation
actuelle. Tu reçois l'état complet en JSON. Donne une recommandation
courte (3-5 phrases max), concrète, en français, basée sur les chiffres
réels de l'état. Pas de formules vagues. Une recommandation par appel.`;

// ─── Tool definitions (Anthropic tool use) ───────────────────

export const TOOL_APPLY_TRIMESTER_OPEN = {
  name: "apply_trimester_open" as const,
  description:
    "Pose la narration d'ouverture du trimestre + optionnellement un événement à 3-4 choix.",
  input_schema: {
    type: "object" as const,
    properties: {
      narration: {
        type: "string",
        description: "Narration d'ouverture du trimestre, en français, 2-4 phrases.",
      },
      event: {
        type: ["object", "null"] as const,
        description: "Événement IA mid-trimestre, ou null si pas d'événement.",
        properties: {
          id: { type: "string" },
          situation: { type: "string", description: "Description en français de la situation." },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string", description: "Libellé du choix en français." },
              },
              required: ["id", "label"],
            },
            minItems: 3,
            maxItems: 4,
          },
        },
        required: ["id", "situation", "choices"],
      },
    },
    required: ["narration", "event"],
  },
};

export const TOOL_APPLY_TRIMESTER_CLOSE = {
  name: "apply_trimester_close" as const,
  description: "Pose la narration de clôture du trimestre.",
  input_schema: {
    type: "object" as const,
    properties: {
      narration: {
        type: "string",
        description:
          "Narration de clôture, en français, 3-6 phrases résumant ce qui s'est passé ce trimestre.",
      },
    },
    required: ["narration"],
  },
};

export const TOOL_VALIDATE_ACTION = {
  name: "validate_action" as const,
  description:
    "Accepte ou rejette une action en langage naturel. Si accepté, retourne l'Action structurée.",
  input_schema: {
    type: "object" as const,
    properties: {
      accepted: { type: "boolean" },
      action: {
        type: ["object", "null"] as const,
        description: "Action structurée si accepted=true, null sinon.",
      },
      reason: {
        type: ["string", "null"] as const,
        description: "Raison du rejet si accepted=false, null sinon.",
      },
    },
    required: ["accepted", "action", "reason"],
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/game/ia/anthropic/prompts.ts
git commit -m "feat(ia): system prompts + tool definitions for GM, Validator, Advisor"
```

---

### Task 8: AnthropicGameMaster

**Files:**
- Create: `lib/game/ia/anthropic/game-master.ts`, `tests/unit/game/ia/anthropic/game-master.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/ia/anthropic/game-master.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";
import { MockGameMaster } from "@/lib/game/ia/mock";
import type { GameState } from "@/lib/game/types";

// Mock the SDK before importing anything that uses it.
const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

// Mock the cost-log so it doesn't try to write to the DB in unit tests.
const recordIaCallMock = vi.fn();
vi.mock("@/lib/game/ia/anthropic/cost-log", () => ({
  recordIaCall: recordIaCallMock,
}));

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

beforeEach(() => {
  createMock.mockReset();
  recordIaCallMock.mockReset();
});

describe("AnthropicGameMaster.openTrimester", () => {
  it("returns narration from the apply_trimester_open tool call and records cost", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: {
            narration: "Q1 2005 démarre, marché tech porteur.",
            event: null,
          },
        },
      ],
      usage: { input_tokens: 1200, cache_read_input_tokens: 0, output_tokens: 120 },
    });
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g1", trimesterIndex: 1 });
    const result = await gm.openTrimester(baseState());
    expect(result.narration).toContain("Q1 2005");
    expect(result.event).toBeNull();
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("game_master_open");
  });

  it("surfaces the event when the model returns one", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: {
            narration: "Un investisseur t'a contacté.",
            event: {
              id: "evt-1",
              situation: "Sequoia veut mener ta Série A.",
              choices: [
                { id: "accept", label: "Accepter" },
                { id: "negotiate", label: "Négocier" },
                { id: "decline", label: "Refuser" },
              ],
            },
          },
        },
      ],
      usage: { input_tokens: 1300, cache_read_input_tokens: 800, output_tokens: 200 },
    });
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g2", trimesterIndex: 3 });
    const result = await gm.openTrimester(baseState());
    expect(result.event?.choices).toHaveLength(3);
    expect(result.event?.id).toBe("evt-1");
  });
});

describe("AnthropicGameMaster.closeTrimester", () => {
  it("delegates state evolution to the inner mock + replaces narration with Claude output", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_close",
          input: { narration: "Trimestre solide. Ton équipe a livré." },
        },
      ],
      usage: { input_tokens: 1500, cache_read_input_tokens: 1200, output_tokens: 180 },
    });
    const inner = new MockGameMaster();
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const gm = new AnthropicGameMaster({ gameId: "g3", trimesterIndex: 1 }, inner);
    const decisions = [
      {
        kind: "action" as const,
        action: { kind: "finance.allocateBudget" as const, category: "marketing" as const, amount: 10_000 },
      },
    ];
    const result = await gm.closeTrimester(baseState(), decisions);
    // State delta from inner mock (cash debited)
    expect(result.newState.playerState.cash).toBe(90_000);
    // Narration from Claude
    expect(result.narration).toContain("Trimestre solide");
    // Cost recorded
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("game_master_close");
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL, "Failed to resolve import @/lib/game/ia/anthropic/game-master".

- [ ] **Step 3: Implement `lib/game/ia/anthropic/game-master.ts`**

```ts
import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import {
  GAME_MASTER_SYSTEM,
  TOOL_APPLY_TRIMESTER_OPEN,
  TOOL_APPLY_TRIMESTER_CLOSE,
} from "./prompts";
import type {
  IGameMaster,
  GameMasterOpening,
  GameMasterClosing,
} from "../types";
import type { Decision, GameState, TrimesterEvent } from "@/lib/game/types";
import { MockGameMaster } from "../mock";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1024;

export type AnthropicGameMasterOptions = {
  gameId: string | null;
  trimesterIndex: number | null;
  model?: string;
};

/**
 * Real Game Master backed by Claude. Composes an inner deterministic GM
 * (default: MockGameMaster) for state evolution (action processing,
 * burnout, time advance) and replaces only the narration + event
 * generation with a Claude call. This keeps the deterministic pipeline
 * deterministic while letting Claude do the human-quality writing.
 */
export class AnthropicGameMaster implements IGameMaster {
  constructor(
    private readonly options: AnthropicGameMasterOptions,
    private readonly inner: IGameMaster = new MockGameMaster(),
  ) {}

  async openTrimester(state: GameState): Promise<GameMasterOpening> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: GAME_MASTER_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_APPLY_TRIMESTER_OPEN],
        tool_choice: { type: "tool", name: "apply_trimester_open" },
        messages: [
          {
            role: "user",
            content: `Ouvre le trimestre. État JSON:\n${serializeForPrompt(state)}`,
          },
        ],
      }),
    );

    await this.recordUsage(response, "game_master_open", model);

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as { type: "tool_use"; name: string; input: { narration: string; event: TrimesterEvent | null } } | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicGameMaster.openTrimester: no tool_use block in response");
    }
    return { narration: toolBlock.input.narration, event: toolBlock.input.event };
  }

  async closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing> {
    // Deterministic pipeline first.
    const baseClosing = await this.inner.closeTrimester(state, decisions);
    // Then ask Claude to narrate the result.
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: GAME_MASTER_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_APPLY_TRIMESTER_CLOSE],
        tool_choice: { type: "tool", name: "apply_trimester_close" },
        messages: [
          {
            role: "user",
            content:
              `Clôture le trimestre. ` +
              `Décisions JSON: ${JSON.stringify(decisions)}\n` +
              `Nouvel état JSON: ${serializeForPrompt(baseClosing.newState)}`,
          },
        ],
      }),
    );

    await this.recordUsage(response, "game_master_close", model);

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as { type: "tool_use"; name: string; input: { narration: string } } | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicGameMaster.closeTrimester: no tool_use block in response");
    }
    return { narration: toolBlock.input.narration, newState: baseClosing.newState };
  }

  private async recordUsage(
    response: { usage: { input_tokens: number; cache_read_input_tokens?: number; output_tokens: number } },
    agentRole: "game_master_open" | "game_master_close",
    model: string,
  ): Promise<void> {
    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: this.options.trimesterIndex,
      agentRole,
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });
  }
}
```

- [ ] **Step 4: Run — must pass**

Expected: 3 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ia/anthropic/game-master.ts tests/unit/game/ia/anthropic/game-master.test.ts
git commit -m "feat(ia): AnthropicGameMaster — Claude narration + inner deterministic pipeline"
```

---

### Task 9: AnthropicValidator

**Files:**
- Create: `lib/game/ia/anthropic/validator.ts`, `tests/unit/game/ia/anthropic/validator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/ia/anthropic/validator.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

const recordIaCallMock = vi.fn();
vi.mock("@/lib/game/ia/anthropic/cost-log", () => ({
  recordIaCall: recordIaCallMock,
}));

const baseState = () =>
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

beforeEach(() => {
  createMock.mockReset();
  recordIaCallMock.mockReset();
});

describe("AnthropicValidator.validate", () => {
  it("returns accepted=true with the parsed Action when the model accepts", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "validate_action",
          input: {
            accepted: true,
            action: { kind: "team.hire", level: "senior", salaryAnnual: 120_000 },
            reason: null,
          },
        },
      ],
      usage: { input_tokens: 800, cache_read_input_tokens: 0, output_tokens: 50 },
    });
    const { AnthropicValidator } = await import("@/lib/game/ia/anthropic/validator");
    const v = new AnthropicValidator({ gameId: "g1" });
    const verdict = await v.validate(baseState(), "j'embauche un senior à 120k");
    expect(verdict.accepted).toBe(true);
    if (verdict.accepted) {
      expect(verdict.action.kind).toBe("team.hire");
    }
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("validator");
  });

  it("returns accepted=false with reason when the model rejects", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "validate_action",
          input: {
            accepted: false,
            action: null,
            reason: "Cash insuffisant pour cette dépense.",
          },
        },
      ],
      usage: { input_tokens: 700, cache_read_input_tokens: 0, output_tokens: 40 },
    });
    const { AnthropicValidator } = await import("@/lib/game/ia/anthropic/validator");
    const v = new AnthropicValidator({ gameId: "g1" });
    const verdict = await v.validate(baseState(), "j'achète un yacht à 10M$");
    expect(verdict.accepted).toBe(false);
    if (!verdict.accepted) {
      expect(verdict.reason).toContain("Cash insuffisant");
    }
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/ia/anthropic/validator.ts`**

```ts
import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import { VALIDATOR_SYSTEM, TOOL_VALIDATE_ACTION } from "./prompts";
import type { IValidator, ValidatorVerdict } from "../types";
import type { Action, GameState } from "@/lib/game/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 512;

export type AnthropicValidatorOptions = {
  gameId: string | null;
  model?: string;
};

export class AnthropicValidator implements IValidator {
  constructor(private readonly options: AnthropicValidatorOptions) {}

  async validate(state: GameState, naturalLanguage: string): Promise<ValidatorVerdict> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: VALIDATOR_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL_VALIDATE_ACTION],
        tool_choice: { type: "tool", name: "validate_action" },
        messages: [
          {
            role: "user",
            content:
              `État JSON: ${serializeForPrompt(state)}\n` +
              `Action en langage naturel: "${naturalLanguage}"`,
          },
        ],
      }),
    );

    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: null,
      agentRole: "validator",
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });

    const toolBlock = response.content.find(
      (b: { type: string }) => b.type === "tool_use",
    ) as
      | {
          type: "tool_use";
          name: string;
          input: { accepted: boolean; action: Action | null; reason: string | null };
        }
      | undefined;
    if (!toolBlock) {
      throw new Error("AnthropicValidator: no tool_use block in response");
    }
    if (toolBlock.input.accepted) {
      if (!toolBlock.input.action) {
        throw new Error("AnthropicValidator: accepted but no action returned");
      }
      return { accepted: true, action: toolBlock.input.action };
    }
    return {
      accepted: false,
      reason: toolBlock.input.reason ?? "(no reason given)",
    };
  }
}
```

- [ ] **Step 4: Run — must pass**

Expected: 2 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ia/anthropic/validator.ts tests/unit/game/ia/anthropic/validator.test.ts
git commit -m "feat(ia): AnthropicValidator — translates NL action to structured Action"
```

---

### Task 10: AnthropicAdvisor

**Files:**
- Create: `lib/game/ia/anthropic/advisor.ts`, `tests/unit/game/ia/anthropic/advisor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/game/ia/anthropic/advisor.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialState } from "@/lib/game/state";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

const recordIaCallMock = vi.fn();
vi.mock("@/lib/game/ia/anthropic/cost-log", () => ({
  recordIaCall: recordIaCallMock,
}));

const baseState = () =>
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

beforeEach(() => {
  createMock.mockReset();
  recordIaCallMock.mockReset();
});

describe("AnthropicAdvisor.recommend", () => {
  it("returns the model's text recommendation and records cost", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Lève une seed maintenant pour étendre ta piste de trésorerie." }],
      usage: { input_tokens: 900, cache_read_input_tokens: 0, output_tokens: 80 },
    });
    const { AnthropicAdvisor } = await import("@/lib/game/ia/anthropic/advisor");
    const a = new AnthropicAdvisor({ gameId: "g1" });
    const recommendation = await a.recommend(baseState());
    expect(recommendation).toContain("seed");
    expect(recordIaCallMock).toHaveBeenCalledOnce();
    expect(recordIaCallMock.mock.calls[0]?.[0].agentRole).toBe("advisor");
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/game/ia/anthropic/advisor.ts`**

```ts
import { anthropicClient, withRetry } from "./client";
import { recordIaCall } from "./cost-log";
import { serializeForPrompt } from "./state-serializer";
import { ADVISOR_SYSTEM } from "./prompts";
import type { IAdvisor } from "../types";
import type { GameState } from "@/lib/game/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 512;

export type AnthropicAdvisorOptions = {
  gameId: string | null;
  model?: string;
};

export class AnthropicAdvisor implements IAdvisor {
  constructor(private readonly options: AnthropicAdvisorOptions) {}

  async recommend(state: GameState): Promise<string> {
    const model = this.options.model ?? DEFAULT_MODEL;
    const response = await withRetry(() =>
      anthropicClient.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: [
          { type: "text", text: ADVISOR_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: `État JSON: ${serializeForPrompt(state)}\n\nRecommande une action.`,
          },
        ],
      }),
    );

    await recordIaCall({
      gameId: this.options.gameId,
      trimesterIndex: null,
      agentRole: "advisor",
      model,
      usage: {
        inputTokensTotal: response.usage.input_tokens,
        inputTokensCached: response.usage.cache_read_input_tokens ?? 0,
        outputTokens: response.usage.output_tokens,
      },
    });

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === "text",
    ) as { type: "text"; text: string } | undefined;
    if (!textBlock) {
      throw new Error("AnthropicAdvisor: no text block in response");
    }
    return textBlock.text;
  }
}
```

- [ ] **Step 4: Run — must pass**

Expected: 1 new test passes.

- [ ] **Step 5: Commit**

```bash
git add lib/game/ia/anthropic/advisor.ts tests/unit/game/ia/anthropic/advisor.test.ts
git commit -m "feat(ia): AnthropicAdvisor — text recommendation backed by Claude"
```

---

### Task 11: Integration test — playthrough with stubbed SDK + cost log assertions

**Files:**
- Create: `tests/integration/game/anthropic-playthrough.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/game/anthropic-playthrough.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { iaCallLog } from "@/lib/db/schema";
import { createInitialState } from "@/lib/game/state";
import { advanceTrimester } from "@/lib/game/engine";
import { ScriptedGameMaster } from "@/lib/game/scenarios/scripted-game-master";
import { getPreset } from "@/lib/game/scenarios/registry";
import { createGameFromPreset } from "@/lib/game/scenarios/persistence";
import { saveTrimester } from "@/lib/game/persistence";
import { createTestUser } from "../setup";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

describe("Anthropic GM playthrough with cost log", () => {
  let cleanups: Array<() => Promise<void>> = [];

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(async () => {
    for (const c of cleanups.splice(0)) {
      await c();
    }
  });

  it("plays 3 trimesters with AnthropicGameMaster (stubbed) and writes 6 cost log rows", async () => {
    const user = await createTestUser("anthropic-pt");
    cleanups.push(user.cleanup);

    const game = await createGameFromPreset({
      userId: user.id,
      presetId: "sf_2005_saas_solo",
    });

    // Each trimester triggers 2 calls (open + close), so 3 trimesters = 6 calls.
    // Stub each call: open returns no event, close returns canned narration.
    const openResp = {
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_open",
          input: { narration: "[claude] opening", event: null },
        },
      ],
      usage: { input_tokens: 1500, cache_read_input_tokens: 1000, output_tokens: 100 },
    };
    const closeResp = {
      content: [
        {
          type: "tool_use",
          name: "apply_trimester_close",
          input: { narration: "[claude] closing" },
        },
      ],
      usage: { input_tokens: 1700, cache_read_input_tokens: 1500, output_tokens: 150 },
    };
    // Sequence: open, close, open, close, open, close.
    createMock
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp)
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp)
      .mockResolvedValueOnce(openResp)
      .mockResolvedValueOnce(closeResp);

    // Build the game master after mocks are in place.
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const preset = getPreset("sf_2005_saas_solo")!;

    let state = createInitialState({
      scenario: {
        presetId: preset.id,
        era: preset.era,
        region: preset.region,
        sector: preset.sector,
        startingYear: preset.startingYear,
        currentQuarter: preset.startingQuarter,
        currentYear: preset.startingYear,
      },
      companyName: preset.companyName,
      startingCash: preset.startingCash,
      startingTeamSize: preset.startingTeamSize,
    });

    for (let i = 1; i <= 3; i++) {
      const inner = new AnthropicGameMaster({ gameId: game.id, trimesterIndex: i });
      const gm = new ScriptedGameMaster(preset, inner);
      const result = await advanceTrimester({ state, decisions: [], gm });
      await saveTrimester({
        gameId: game.id,
        trimesterIndex: i,
        state: result.newState,
        narrationOpening: result.opening.narration,
        narrationClosing: result.closing.narration,
        event: result.opening.event,
        decisions: [],
      });
      state = result.newState;
    }

    // Cost log should have exactly 6 rows for this game.
    const rows = await db.select().from(iaCallLog).where(eq(iaCallLog.gameId, game.id));
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.agentRole === "game_master_open")).toHaveLength(3);
    expect(rows.filter((r) => r.agentRole === "game_master_close")).toHaveLength(3);
    // Spot-check pricing: Sonnet 4.6 default. cost should be > 0 and < 1c per call.
    for (const row of rows) {
      const cost = Number(row.costUsd);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
    }
  });
});
```

- [ ] **Step 2: Run the integration suite**

```bash
set -a && source .env.local && set +a
npm run test:integration
```

Expected: 4 integration tests pass total (the 2 from Plan #2's playthrough + Plan #3's SF 2005 + this new one).

- [ ] **Step 3: Run unit suite to confirm no regressions**

```bash
npm test
```

Expected: all unit tests still pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/game/anthropic-playthrough.test.ts
git commit -m "test(ia): integration playthrough with stubbed Anthropic SDK + cost log assertions"
```

---

### Task 12: Final cross-cutting verification

**Files:** none

- [ ] **Step 1: Run all checks back-to-back**

```bash
npx tsc --noEmit
npm test
set -a && source .env.local && set +a
npm run test:integration
npm run test:e2e
```

Expected: tsc clean; unit tests all green; integration tests all green (Plan #2's 2 + Plan #3's 1 + this Plan's 1 = 4); E2E correctly skips gates when bypass active (or all green if bypass off).

- [ ] **Step 2: Run a clean production build**

```bash
rm -rf .next
npm run build
```

Expected: build completes without errors.

- [ ] **Step 3: No commit needed**

The Real IA Integration plan is complete. Plan #5 (UI) picks up from here — it will wire HTTP API routes that invoke `AnthropicGameMaster` (via `ScriptedGameMaster`), `AnthropicValidator` (when the player uses the NL escape hatch), and `AnthropicAdvisor` (on-demand button), and stitch them into the React server components for the dashboard / game / endings flows.

---

## Self-Review

Run by the plan author after writing the plan, before handing off.

**Spec coverage check** (against `docs/superpowers/specs/2026-04-25-venture-historia-design.md` § 7 Architecture IA + § 9 Monétisation):

- ✅ 🎭 Market GM (Sonnet 4.6 default) — open + close, 2 calls per trimester — Tasks 7, 8
- ✅ 🛡️ Validator — translates NL to structured Action — Task 9 (uses Sonnet 4.6 in MVP; Haiku tier deferred to Plan #7 alongside credits per scope decision)
- ✅ 🧙 Advisor on-demand — text recommendation — Task 10
- ✅ Prompt caching agressif (TTL 5 min) — `cache_control: { type: "ephemeral" }` on the system prompt in all 3 agents (Tasks 8, 9, 10)
- ✅ Cost tracking infrastructure — `iaCallLog` table + `recordIaCall` (Tasks 2, 4); pricing helper for Sonnet/Haiku/Opus all included even though MVP only invokes Sonnet (Task 3)
- ⏸ Modèle adaptatif (Haiku for Validator, Opus for endings) — explicitly deferred to Plan #7 (where per-feature tier selection will be exposed to the player along with credit pricing)
- ⏸ Compression de l'historique (sliding window) — deferred to Plan #6 (save/resume) — gets relevant once games are long enough to bloat context
- ⏸ Mentor IA persistant — Phase 2 of the spec, explicitly out of scope
- ⏸ Real-time cost display to player — Plan #5/#7 (UI)

**Placeholder scan**: no "TBD", no "implement later", no untested assertions. The deferred items (model tiering, sliding window) are explicitly listed in Out of scope with their target plans.

**Type-consistency check**:
- `AnthropicModel` union in `pricing.ts` (Task 3) covers exactly the 3 models referenced in `DEFAULT_MODEL` constants in Tasks 8, 9, 10.
- `AgentRole` union in `cost-log.ts` (Task 4) — `"game_master_open" | "game_master_close" | "validator" | "advisor"` — matches both the table schema enum (Task 2) and every call site in Tasks 8, 9, 10.
- `Usage` shape in `pricing.ts` (Task 3) — `{ inputTokensTotal, inputTokensCached, outputTokens }` — matches the constructed object in `recordUsage` calls in Tasks 8, 9, 10.
- `IGameMaster`, `IValidator`, `IAdvisor`, `ValidatorVerdict`, `GameMasterOpening`, `GameMasterClosing` are imported from `lib/game/ia/types.ts` (Plan #2's interface) and implemented exactly per signature in Tasks 8, 9, 10.
- `ScriptedGameMaster` (from Plan #3) accepts `inner: IGameMaster` — `new AnthropicGameMaster({...})` satisfies that constraint, verified in Task 11's integration test.
- The `tool_use` content block shape (`{ type: "tool_use"; name; input }`) is consistent across all 3 agents and matches Anthropic SDK's response model.
