import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { env } from "@/lib/env";
import Link from "next/link";
import { ViewportGuard } from "@/components/ui/viewport-guard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <ViewportGuard>
      <div className="min-h-screen">
        {env.AUTH_DEV_BYPASS && (
          <div className="bg-warn/15 border-b border-warn/40 text-warn px-6 py-1.5 text-center text-xs font-medium">
            ⚠ AUTH_DEV_BYPASS actif — toutes les requêtes utilisent
            <code className="mx-1 rounded bg-warn/20 px-1 font-mono">{session.user.email}</code>.
          </div>
        )}
        <header className="border-b border-border-subtle px-6 py-3">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between">
            <Link href="/dashboard" className="text-[16px] font-semibold text-text-primary">
              Venture Historia
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted">{session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded border border-border-subtle px-2.5 py-1 text-xs text-text-default hover:bg-panel-elev"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-6">{children}</main>
      </div>
    </ViewportGuard>
  );
}
