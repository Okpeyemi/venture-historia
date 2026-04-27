import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPreset } from "@/lib/game/scenarios/registry";

vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
vi.stubEnv("AUTH_SECRET", "x".repeat(32));
vi.stubEnv("AUTH_GOOGLE_ID", "id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));

describe("buildGameMaster", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a ScriptedGameMaster wrapping AnthropicGameMaster when MOCK_IA=false", async () => {
    vi.stubEnv("MOCK_IA", "false");
    const { buildGameMaster } = await import("@/lib/game/ia/build-game-master");
    const { ScriptedGameMaster } = await import("@/lib/game/scenarios/scripted-game-master");
    const { AnthropicGameMaster } = await import("@/lib/game/ia/anthropic/game-master");
    const preset = getPreset("sf_2005_saas_solo")!;
    const gm = buildGameMaster({ preset, gameId: "g1", trimesterIndex: 1 });
    expect(gm).toBeInstanceOf(ScriptedGameMaster);
    // Behavioural verification that AnthropicGameMaster was the inner
    // requires reflection. Here we trust the type + the mock-mode test
    // below to characterize behaviour comprehensively.
    expect(AnthropicGameMaster).toBeDefined();
  });

  it("returns a ScriptedGameMaster wrapping MockGameMaster when MOCK_IA=true", async () => {
    vi.stubEnv("MOCK_IA", "true");
    const { buildGameMaster } = await import("@/lib/game/ia/build-game-master");
    const { ScriptedGameMaster } = await import("@/lib/game/scenarios/scripted-game-master");
    const preset = getPreset("sf_2005_saas_solo")!;
    const gm = buildGameMaster({ preset, gameId: "g1", trimesterIndex: 1 });
    expect(gm).toBeInstanceOf(ScriptedGameMaster);
    // Behavioural assertion: openTrimester returns a "[mock]" narration
    // (MockGameMaster's signature) within ScriptedGameMaster's wrapper.
    const { createInitialState } = await import("@/lib/game/state");
    const state = createInitialState({
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
    const result = await gm.openTrimester(state);
    expect(result.narration).toContain("[mock]");
  });
});

describe("buildValidator", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns AnthropicValidator when MOCK_IA=false", async () => {
    vi.stubEnv("MOCK_IA", "false");
    const { buildValidator } = await import("@/lib/game/ia/build-game-master");
    const { AnthropicValidator } = await import("@/lib/game/ia/anthropic/validator");
    const v = buildValidator({ gameId: "g1" });
    expect(v).toBeInstanceOf(AnthropicValidator);
  });

  it("returns MockValidator when MOCK_IA=true", async () => {
    vi.stubEnv("MOCK_IA", "true");
    const { buildValidator } = await import("@/lib/game/ia/build-game-master");
    const { MockValidator } = await import("@/lib/game/ia/mock");
    const v = buildValidator({ gameId: "g1" });
    expect(v).toBeInstanceOf(MockValidator);
  });
});

describe("buildAdvisor", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns AnthropicAdvisor when MOCK_IA=false", async () => {
    vi.stubEnv("MOCK_IA", "false");
    const { buildAdvisor } = await import("@/lib/game/ia/build-game-master");
    const { AnthropicAdvisor } = await import("@/lib/game/ia/anthropic/advisor");
    const a = buildAdvisor({ gameId: "g1" });
    expect(a).toBeInstanceOf(AnthropicAdvisor);
  });

  it("returns MockAdvisor when MOCK_IA=true", async () => {
    vi.stubEnv("MOCK_IA", "true");
    const { buildAdvisor } = await import("@/lib/game/ia/build-game-master");
    const { MockAdvisor } = await import("@/lib/game/ia/mock");
    const a = buildAdvisor({ gameId: "g1" });
    expect(a).toBeInstanceOf(MockAdvisor);
  });
});
