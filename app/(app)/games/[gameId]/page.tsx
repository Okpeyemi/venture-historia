import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadGame, loadTrimester } from "@/lib/game/persistence";
import { TopBar } from "./_components/top-bar";
import { TrimesterNarration } from "./_components/trimester-narration";
import { DecisionList } from "./_components/decision-list";
import { ContextualHintPanel } from "./_components/contextual-hint-panel";
import { ActionMenu } from "./_components/action-menu";
import { EventModal } from "./_components/event-modal";
import { AdvisorPanel } from "./_components/advisor-panel";
import { TutorialOverlay } from "./_components/tutorial-overlay";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { gameId } = await params;
  const game = await loadGame(gameId);
  if (!game || game.userId !== session.user.id) notFound();
  if (game.status !== "in_progress") redirect(`/games/${gameId}/end`);

  const currentRow = await loadTrimester(gameId, game.currentTrimesterIndex);
  if (!currentRow) notFound();

  const opening = game.pendingOpening;
  const quarterLabel = `${currentRow.state.scenario.currentQuarter} · ${currentRow.state.scenario.currentYear}`;

  return (
    <div
      className="grid h-[calc(100vh-9rem)] grid-rows-[auto_1fr] gap-3"
      style={{ minHeight: 0 }}
    >
      <TopBar gameId={gameId} state={currentRow.state} />

      <div className="grid grid-cols-2 gap-3" style={{ minHeight: 0 }}>
        {/* LEFT */}
        <div className="flex flex-col gap-3 min-h-0">
          {opening?.event ? (
            <EventModal gameId={gameId} event={opening.event} />
          ) : (
            <TrimesterNarration
              narrationOpening={opening?.narrationOpening ?? null}
              quarterLabel={quarterLabel}
            />
          )}
          <DecisionList decisions={currentRow.decisions} />
          <ContextualHintPanel state={currentRow.state} />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <ActionMenu gameId={gameId} state={currentRow.state} />
          <AdvisorPanel gameId={gameId} />
        </div>
      </div>

      {!opening?.event && <TutorialOverlay />}
    </div>
  );
}
