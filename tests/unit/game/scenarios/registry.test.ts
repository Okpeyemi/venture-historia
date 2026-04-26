import { describe, it, expect } from "vitest";
import { getPreset, listPresets } from "@/lib/game/scenarios/registry";

describe("scenario registry", () => {
  it("returns the SF 2005 SaaS preset by id", () => {
    const preset = getPreset("sf_2005_saas_solo");
    expect(preset).not.toBeNull();
    expect(preset?.name).toContain("Silicon Valley 2005");
    expect(preset?.companyName).toBe("NimbusCRM");
  });

  it("returns null for an unknown preset id", () => {
    expect(getPreset("does_not_exist")).toBeNull();
  });

  it("listPresets returns all registered preset summaries", () => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(1);
    const sf = presets.find((p) => p.id === "sf_2005_saas_solo");
    expect(sf).toBeDefined();
    expect(sf?.name).toContain("Silicon Valley 2005");
  });
});
