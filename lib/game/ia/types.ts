import type { Action, GameState, TrimesterEvent, Decision } from "../types";

export type GameMasterOpening = {
  narration: string;
  event: TrimesterEvent | null;
};

export type GameMasterClosing = {
  narration: string;
  newState: GameState;
};

export interface IGameMaster {
  /** Compose the trimester opening: narration of context + maybe an event. */
  openTrimester(state: GameState): Promise<GameMasterOpening>;

  /** Resolve the trimester: combine player decisions into the next state and narrate. */
  closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing>;
}

export type ValidatorVerdict =
  | { accepted: true; action: Action }
  | { accepted: false; reason: string };

export interface IValidator {
  /** Translate a free-text NL action into a structured Action, or reject with a reason. */
  validate(state: GameState, naturalLanguage: string): Promise<ValidatorVerdict>;
}

export interface IAdvisor {
  /** Return a short recommendation tailored to the current state. */
  recommend(state: GameState): Promise<string>;
}
