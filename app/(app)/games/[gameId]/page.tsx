import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadGame, loadTrimester } from "@/lib/game/persistence";
import { advanceTrimesterAction } from "../actions";
import { MetricsHeader } from "./_components/metrics-header";
import { TrimesterNarration } from "./_components/trimester-narration";
import { DecisionList } from "./_components/decision-list";
import { ActionMenu } from "./_components/action-menu";
import { EventModal } from "./_components/event-modal";

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

  return (
    <div className="space-y-6">
      {opening?.event ? (
        <EventModal gameId={gameId} event={opening.event} />
      ) : null}

      <MetricsHeader state={currentRow.state} />

      <TrimesterNarration narrationOpening={opening?.narrationOpening ?? null} />

      <DecisionList decisions={currentRow.decisions} />

      <ActionMenu gameId={gameId} state={currentRow.state} />

      <form
        action={async () => {
          "use server";
          await advanceTrimesterAction(gameId);
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500"
        >
          Avancer le trimestre →
        </button>
      </form>
    </div>
  );
}
