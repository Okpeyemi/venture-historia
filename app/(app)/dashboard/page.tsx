import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="mt-2 text-neutral-400">
          Bienvenue {session?.user?.name ?? session?.user?.email}.
        </p>
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-neutral-400">
          Aucune partie en cours. Le système de jeu arrivera dans le plan suivant.
        </p>
      </div>
    </div>
  );
}
