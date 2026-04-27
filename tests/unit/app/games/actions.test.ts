import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/db");
vi.stubEnv("AUTH_SECRET", "x".repeat(32));
vi.stubEnv("AUTH_GOOGLE_ID", "id");
vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
vi.stubEnv("MOCK_IA", "false");

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));

// Mock auth — caller is dev-bypass-user.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user-id" } }),
}));

// Mock persistence — return a fake game owned by test-user-id with a current trimester.
const fakeGame = {
  id: "g1",
  userId: "test-user-id",
  scenarioPresetId: "sf_2005_saas_solo",
  status: "in_progress" as const,
  endingType: null,
  endingSummary: null,
  pendingOpening: null,
  currentTrimesterIndex: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const appendMock = vi.fn();
vi.mock("@/lib/game/persistence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/game/persistence")>(
    "@/lib/game/persistence",
  );
  return {
    ...actual,
    loadGame: vi.fn().mockResolvedValue(fakeGame),
    loadTrimester: vi.fn().mockResolvedValue({
      gameId: "g1",
      trimesterIndex: 1,
      state: {
        scenario: {
          presetId: "sf_2005_saas_solo",
          era: 2005,
          region: "T",
          sector: "T",
          startingYear: 2005,
          currentQuarter: "Q1",
          currentYear: 2005,
        },
        worldState: { marketConditions: "neutral", macroEventsActive: [], competitors: [], firedMilestones: [] },
        playerState: {
          companyName: "TestCo",
          cash: 100_000,
          teamSize: 2,
          mrr: 0,
          reputation: 50,
          runwayMonths: 5,
          founderBurnout: 20,
          boardTension: 0,
          products: [],
          investors: [],
          boardSeatsTaken: 0,
        },
        history: { trimestersPlayed: 0, narrativeSummary: "", keyDecisions: [], activeConsequences: [] },
      },
      narrationOpening: null,
      narrationClosing: null,
      event: null,
      decisions: [],
      createdAt: new Date(),
    }),
    appendDecisionToTrimester: appendMock,
  };
});

// Mock revalidatePath so we don't try to talk to Next's cache infra.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the validator factory to return an accepting validator.
vi.mock("@/lib/game/ia/build-game-master", async () => {
  const { MockValidatorAccepting } = await import("@/lib/game/ia/mock");
  return {
    buildValidator: () =>
      new MockValidatorAccepting({
        kind: "team.hire",
        level: "senior",
        salaryAnnual: 120_000,
      }),
    buildAdvisor: vi.fn(),
    buildGameMaster: vi.fn(),
  };
});

beforeEach(() => {
  appendMock.mockReset();
});

describe("validateNlActionAction (accept path)", () => {
  it("returns ok:true and persists the structured action via appendDecisionToTrimester", async () => {
    const { validateNlActionAction } = await import("@/app/(app)/games/actions");
    const result = await validateNlActionAction({
      gameId: "g1",
      naturalLanguage: "j'embauche un senior à 120k",
    });
    expect(result.ok).toBe(true);
    expect(appendMock).toHaveBeenCalledOnce();
    expect(appendMock.mock.calls[0]?.[0].decision).toEqual({
      kind: "action",
      action: { kind: "team.hire", level: "senior", salaryAnnual: 120_000 },
    });
  });
});
