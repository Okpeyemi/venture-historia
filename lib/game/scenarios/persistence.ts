import { createInitialState } from "../state";
import { createGame, type GameRow } from "../persistence";
import { getPreset } from "./registry";

/**
 * Load a preset by id and create a new game in the DB seeded from it.
 * Throws if the preset id is unknown.
 *
 * The seeded GameState includes the preset's competitors (lifted from the
 * ScenarioCompetitor[]) and starting economic params. macroEvents and
 * milestones live on the preset itself (referenced by id via
 * scenario.presetId), so the engine can re-evaluate them each trimester
 * without storing them on every row.
 */
export async function createGameFromPreset(args: {
  userId: string;
  presetId: string;
}): Promise<GameRow> {
  const preset = getPreset(args.presetId);
  if (!preset) {
    throw new Error(`createGameFromPreset: unknown preset "${args.presetId}"`);
  }

  const initialState = createInitialState({
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

  const seededState = {
    ...initialState,
    worldState: {
      ...initialState.worldState,
      competitors: preset.competitors.map((c) => ({
        id: c.id,
        name: c.name,
        scriptedPersona: c.scriptedPersona,
        scriptedState: { valuation: c.initialValuation, teamSize: c.initialTeamSize },
      })),
    },
    playerState: {
      ...initialState.playerState,
      products: preset.startingProducts,
    },
  };

  return createGame({
    userId: args.userId,
    scenarioPresetId: preset.id,
    initialState: seededState,
  });
}
