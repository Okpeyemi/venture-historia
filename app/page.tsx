import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Venture Historia</h1>
      <p className="max-w-xl text-lg text-neutral-400">
        Un sim entrepreneurial narratif long format. Construis ton empire à
        travers les décennies, à n'importe quelle époque.
      </p>
      <Link
        href="/signin"
        className="rounded-md bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
      >
        Se connecter
      </Link>
    </main>
  );
}
