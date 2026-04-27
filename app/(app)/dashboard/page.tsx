import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { listPresets } from "@/lib/game/scenarios/registry";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userGames = await db
    .select()
    .from(games)
    .where(eq(games.userId, session.user.id))
    .orderBy(desc(games.updatedAt))
    .limit(10);

  const presets = listPresets();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="mt-2 text-neutral-400">
          Bienvenue {session.user.name ?? session.user.email}.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tes parties</h2>
        {userGames.length === 0 ? (
          <p className="text-neutral-400">Aucune partie pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {userGames.map((g) => (
              <li
                key={g.id}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
              >
                <Link
                  href={
                    g.status === "in_progress"
                      ? `/games/${g.id}`
                      : `/games/${g.id}/end`
                  }
                  className="flex items-center justify-between"
                >
                  <span>
                    <span className="font-medium">{g.scenarioPresetId}</span>{" "}
                    <span className="text-neutral-500">— Q{g.currentTrimesterIndex}</span>
                  </span>
                  <span className="text-sm text-neutral-400">
                    {g.status === "in_progress"
                      ? "En cours"
                      : g.status === "ended_success"
                        ? `Réussi: ${g.endingType}`
                        : `Fin: ${g.endingType}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Nouvelle partie</h2>
        <ul className="space-y-2">
          {presets.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <form action={`/games/new/${p.id}`} method="post">
                <button
                  type="submit"
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="rounded-md bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-900">
                      Démarrer
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">{p.loreSummary}</p>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
