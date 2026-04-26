import { describe, it, expect } from "vitest";
import { processProduct } from "@/lib/game/actions/product";
import { createInitialState } from "@/lib/game/state";
import { InvalidActionError } from "@/lib/game/types";
import type { GameState, Action } from "@/lib/game/types";

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
    startingCash: 200_000,
    startingTeamSize: 3,
  });

describe("processProduct — product.startRD", () => {
  it("adds a product in R&D stage with the given quartersUntilLaunch", () => {
    const state = baseState();
    const action: Action = { kind: "product.startRD", productName: "Nimbus v1", quartersUntilLaunch: 3 };
    const next = processProduct(state, action);
    expect(next.playerState.products).toEqual([
      { name: "Nimbus v1", stage: "rd", satisfaction: 0, quartersInRD: 3 },
    ]);
  });

  it("rejects starting R&D on a name that already exists", () => {
    const action: Action = { kind: "product.startRD", productName: "X", quartersUntilLaunch: 2 };
    const stateWithProduct = processProduct(baseState(), action);
    expect(() => processProduct(stateWithProduct, action)).toThrow(/already exists/i);
  });
});

describe("processProduct — product.launch", () => {
  it("transitions an existing R&D product to shipped, sets satisfaction to 60", () => {
    const startedRD: Action = { kind: "product.startRD", productName: "Nimbus v1", quartersUntilLaunch: 1 };
    const state = processProduct(baseState(), startedRD);
    const launch: Action = { kind: "product.launch", productName: "Nimbus v1" };
    const next = processProduct(state, launch);
    expect(next.playerState.products[0]).toMatchObject({
      name: "Nimbus v1",
      stage: "shipped",
      satisfaction: 60,
    });
  });

  it("rejects launching a product that doesn't exist", () => {
    const action: Action = { kind: "product.launch", productName: "Ghost" };
    expect(() => processProduct(baseState(), action)).toThrow(/not found/i);
  });
});
