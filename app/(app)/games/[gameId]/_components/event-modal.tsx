"use client";

import { useTransition } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
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
    <Panel title="⚡ Événement" badge="Réagis" variant="alert">
      <p className="mb-3 text-[13px] leading-[1.5] text-text-default">{event.situation}</p>
      <div className="flex flex-col gap-2">
        {event.choices.map((c) => (
          <Button
            key={c.id}
            variant="secondary"
            size="md"
            disabled={isPending}
            onClick={() => choose(c.id)}
            className="!justify-start text-left !border-event/40 hover:!bg-event/10"
          >
            {c.label}
          </Button>
        ))}
      </div>
    </Panel>
  );
}
