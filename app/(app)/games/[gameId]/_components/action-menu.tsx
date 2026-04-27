"use client";

import { useState } from "react";
import { Tabs, TabPanel, tabIds } from "@/components/ui/tabs";
import { Panel } from "@/components/ui/panel";
import { ActionForms } from "./action-forms";
import type { GameState } from "@/lib/game/types";

const OPTIONS = [
  { id: "finance",  label: "💰 Finance" },
  { id: "team",     label: "👥 Équipe" },
  { id: "product",  label: "🚀 Produit" },
  { id: "market",   label: "📈 Marché" },
  { id: "strategy", label: "🤝 Stratégie" },
  { id: "nl",       label: "📝 Libre" },
  { id: "endgame",  label: "🏁 Sortie" },
] as const;

type Category = (typeof OPTIONS)[number]["id"];

const PREFIX = "action-menu";

export function ActionMenu({ gameId, state }: { gameId: string; state: GameState }) {
  const [active, setActive] = useState<Category>("finance");
  const activeLabel = OPTIONS.find((o) => o.id === active)!.label;
  const { tabId, panelId } = tabIds(PREFIX, active);

  return (
    <div className="flex flex-col gap-2.5">
      <div data-tutorial-target="tabs">
        <Tabs<Category>
          value={active}
          onChange={setActive}
          options={OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          idPrefix={PREFIX}
        />
      </div>
      <TabPanel id={panelId} tabId={tabId}>
        <Panel title={activeLabel} variant="default">
          <ActionForms gameId={gameId} state={state} category={active} />
        </Panel>
      </TabPanel>
    </div>
  );
}
