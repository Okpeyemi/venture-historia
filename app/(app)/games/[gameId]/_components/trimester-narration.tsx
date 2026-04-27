import { Panel } from "@/components/ui/panel";

export function TrimesterNarration({
  narrationOpening,
  quarterLabel,
}: {
  narrationOpening: string | null;
  quarterLabel: string;
}) {
  if (!narrationOpening) {
    return (
      <Panel title="Ouverture du trimestre" badge={quarterLabel} variant="narration">
        <p className="text-text-muted">Le trimestre n'a pas encore démarré.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Ouverture du trimestre" badge={quarterLabel} variant="narration">
      <p
        data-tutorial-target="narration"
        className="font-serif whitespace-pre-line text-[13.5px] leading-[1.6] text-text-default"
      >
        {narrationOpening}
      </p>
    </Panel>
  );
}
