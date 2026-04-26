import type { ScenarioPreset } from "./types";
import { SF_2005_SAAS } from "./sf-2005-saas";

const PRESETS: Record<string, ScenarioPreset> = {
  [SF_2005_SAAS.id]: SF_2005_SAAS,
};

export function getPreset(id: string): ScenarioPreset | null {
  return PRESETS[id] ?? null;
}

export type ScenarioPresetSummary = Pick<
  ScenarioPreset,
  "id" | "name" | "era" | "region" | "sector" | "loreSummary"
>;

export function listPresets(): ScenarioPresetSummary[] {
  return Object.values(PRESETS).map((p) => ({
    id: p.id,
    name: p.name,
    era: p.era,
    region: p.region,
    sector: p.sector,
    loreSummary: p.loreSummary,
  }));
}
