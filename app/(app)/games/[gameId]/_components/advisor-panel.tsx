"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
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
    <Panel title="🧙 Mentor IA" variant="advisor">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-[1.5] text-advisor">
          {advice && expanded && !isPending
            ? advice
            : "Conseil personnalisé sur l'état actuel."}
        </p>
        <div className="flex flex-shrink-0 gap-1.5">
          {expanded && advice ? (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Replier
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={askAdvisor}
            disabled={isPending}
            className="!bg-advisor !text-white"
          >
            {isPending ? "Réflexion…" : advice ? "💡 À nouveau" : "💡 Demander"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
