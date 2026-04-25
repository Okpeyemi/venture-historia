import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Connexion</h1>
      <p className="text-neutral-400">
        Connecte-toi pour accéder à ton tableau de bord.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Continuer avec Google
        </button>
      </form>
    </main>
  );
}
