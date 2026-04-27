"use client";

import { TUTORIAL_FLAG_KEY, TUTORIAL_REPLAY_EVENT } from "@/lib/game/ui/tutorial-steps";

export function TutorialReplayButton() {
  const replay = () => {
    try {
      window.localStorage.removeItem(TUTORIAL_FLAG_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(TUTORIAL_REPLAY_EVENT));
  };

  return (
    <button
      type="button"
      onClick={replay}
      className="flex-shrink-0 rounded border border-help/40 px-2 py-0.5 text-[10px] text-help hover:bg-help/10"
    >
      Revoir le tutoriel
    </button>
  );
}
