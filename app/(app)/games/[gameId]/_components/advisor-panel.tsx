"use client";

import { useState, useTransition } from "react";
import { requestAdviceAction } from "../../actions";

export function AdvisorPanel({ gameId }: { gameId: string }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const askAdvisor = () => {
    setExpanded(true);
    startTransition(async () => {
      const text = await requestAdviceAction(gameId);
      setAdvice(text);
    });
  };

  return (
    <div className="rounded-lg border border-indigo-700 bg-indigo-950/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase text-indigo-400">🧙 Mentor IA</h2>
        <div className="flex gap-2">
          {expanded && advice ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-md border border-indigo-700 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-900/40"
            >
              Replier
            </button>
          ) : null}
          <button
            type="button"
            onClick={askAdvisor}
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isPending
              ? "Réflexion..."
              : advice
                ? "💡 Demander à nouveau"
                : "💡 Demander conseil"}
          </button>
        </div>
      </div>
      {expanded && advice && !isPending ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-indigo-100">
          {advice}
        </p>
      ) : null}
    </div>
  );
}
