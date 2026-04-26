import type { Decision, GameState } from "../types";
import type { IGameMaster, GameMasterOpening, GameMasterClosing } from "../ia/types";
import { MockGameMaster } from "../ia/mock";
import type { ScenarioPreset } from "./types";
import { evaluateMilestones, applyMilestoneReactions } from "./milestones";
import { evaluateMacroEvents, applyMacroEventEffects } from "./macro-events";

/**
 * Composes an inner IGameMaster (default: MockGameMaster) with the
 * scripted reactions defined in a ScenarioPreset:
 *   - openTrimester: forwards to inner, then prepends macro-event narration
 *     for any event scheduled at the current quarter.
 *   - closeTrimester: forwards to inner (which applies decisions, computes
 *     burnout, advances time), then evaluates competitor milestones against
 *     the inner's already-advanced state and applies their reactions.
 *
 * In Plan #4, swap MockGameMaster for the real Anthropic-backed GM —
 * ScriptedGameMaster's contract stays the same.
 */
export class ScriptedGameMaster implements IGameMaster {
  constructor(
    private readonly preset: ScenarioPreset,
    private readonly inner: IGameMaster = new MockGameMaster(),
  ) {}

  async openTrimester(state: GameState): Promise<GameMasterOpening> {
    const baseOpening = await this.inner.openTrimester(state);
    const macroFirings = evaluateMacroEvents(this.preset.macroEvents, state);
    if (macroFirings.length === 0) return baseOpening;
    const macroNarration = macroFirings.map((e) => e.narration).join("\n");
    return {
      narration: `${macroNarration}\n\n${baseOpening.narration}`,
      event: baseOpening.event,
    };
  }

  async closeTrimester(state: GameState, decisions: Decision[]): Promise<GameMasterClosing> {
    const baseClosing = await this.inner.closeTrimester(state, decisions);
    let next = baseClosing.newState;

    // Apply macro events scheduled for the trimester we just played.
    // Re-evaluate at close (in addition to opening) so the firing is
    // always recorded in firedMilestones, even if openTrimester wasn't
    // called for this trimester (e.g. game resumed mid-trimester).
    const macroFirings = evaluateMacroEvents(this.preset.macroEvents, state);
    next = applyMacroEventEffects(next, macroFirings);

    // Apply milestone reactions against the already-advanced state.
    const milestoneFirings = evaluateMilestones(this.preset.competitors, next);
    next = applyMilestoneReactions(next, milestoneFirings);

    return { narration: baseClosing.narration, newState: next };
  }
}
