export function TrimesterNarration({
  narrationOpening,
}: {
  narrationOpening: string | null;
}) {
  if (!narrationOpening) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
        Le trimestre n'a pas encore démarré.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-2 text-sm uppercase text-neutral-500">Ouverture du trimestre</h2>
      <p className="whitespace-pre-line leading-relaxed">{narrationOpening}</p>
    </div>
  );
}
