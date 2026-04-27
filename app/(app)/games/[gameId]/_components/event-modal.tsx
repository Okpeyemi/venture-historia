"use client";

import { useTransition } from "react";
import { chooseEventChoiceAction } from "../../actions";
import type { TrimesterEvent } from "@/lib/game/types";

export function EventModal({
  gameId,
  event,
}: {
  gameId: string;
  event: TrimesterEvent;
}) {
  const [isPending, startTransition] = useTransition();
  const choose = (choiceId: string) =>
    startTransition(() =>
      chooseEventChoiceAction({ gameId, eventId: event.id, choiceId }),
    );
  return (
    <div className="rounded-lg border-2 border-amber-600 bg-amber-950/30 p-6">
      <div className="mb-2 text-sm uppercase text-amber-500">⚡ Événement</div>
      <p className="mb-4 leading-relaxed">{event.situation}</p>
      <div className="flex flex-col gap-2">
        {event.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={isPending}
            onClick={() => choose(c.id)}
            className="rounded-md border border-amber-700 bg-amber-900/40 px-4 py-2 text-left text-sm hover:bg-amber-800/50 disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
