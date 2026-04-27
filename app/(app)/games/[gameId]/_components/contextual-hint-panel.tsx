import { Panel } from "@/components/ui/panel";
import { pickHint } from "@/lib/game/ui/contextual-hints";
import { TutorialReplayButton } from "./tutorial-replay-button";
import type { GameState } from "@/lib/game/types";

export function ContextualHintPanel({ state }: { state: GameState }) {
  const hint = pickHint(state);
  const trimNumber = state.history.trimestersPlayed + 1;
  return (
    <Panel
      title="💡 Aide contextuelle"
      badge={`Trimestre ${trimNumber}`}
      variant="hint"
    >
      <div className="flex items-start justify-between gap-3">
        <p
          data-hint-id={hint.id}
          className="text-[12px] leading-[1.5] text-help"
        >
          {hint.message}
        </p>
        <TutorialReplayButton />
      </div>
    </Panel>
  );
}
