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
