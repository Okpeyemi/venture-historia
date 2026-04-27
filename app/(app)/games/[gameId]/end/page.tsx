import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { loadGame } from "@/lib/game/persistence";
import Link from "next/link";

const ICONS: Record<string, string> = {
  ipo: "🎉",
  acquisition: "🤝",
  lifestyle: "🏡",
  conglomerate: "👑",
  bankruptcy: "💀",
  ousting: "🪑",
  burnout: "🔥",
  industry_collapse: "🌪️",
};

export default async function EndPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { gameId } = await params;
  const game = await loadGame(gameId);
  if (!game || game.userId !== session.user.id) notFound();
  if (game.status === "in_progress") redirect(`/games/${gameId}`);

  const icon = ICONS[game.endingType ?? ""] ?? "🏁";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
      <div className="text-7xl">{icon}</div>
      <h1 className="text-3xl font-bold">
        {game.status === "ended_success" ? "Fin: succès" : "Fin: échec"} —{" "}
        {game.endingType}
      </h1>
      <p className="text-lg leading-relaxed text-neutral-300">
        {game.endingSummary}
      </p>
      <p className="text-sm text-neutral-500">
        Trimestres joués : {game.currentTrimesterIndex}
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-md bg-neutral-100 px-6 py-3 font-medium text-neutral-900 hover:bg-neutral-200"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}
