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
