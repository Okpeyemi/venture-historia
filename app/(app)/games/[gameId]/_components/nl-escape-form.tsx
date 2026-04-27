"use client";

import { useState, useTransition } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { validateNlActionAction } from "../../actions";

type Verdict =
  | { kind: "idle" }
  | { kind: "accepted" }
  | { kind: "rejected"; reason: string };

export function NlEscapeForm({ gameId }: { gameId: string }) {
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setVerdict({ kind: "idle" });
    startTransition(async () => {
      const result = await validateNlActionAction({
        gameId,
        naturalLanguage: text,
      });
      if (result.ok) {
        setText("");
        setVerdict({ kind: "accepted" });
      } else {
        setVerdict({ kind: "rejected", reason: result.reason });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-muted">
        Tape une action en français. Le validateur l'interprète en action structurée si elle est légale.
      </p>
      <Field label="Action en langage naturel">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={isPending}
          placeholder="ex: j'embauche un CTO à 180k pour accélérer la R&D"
          className="w-full resize-y rounded border border-border-subtle bg-base p-2.5 text-sm text-text-default focus:border-info focus:outline-none disabled:opacity-50"
        />
      </Field>
      <Button
        variant="primary"
        size="md"
        onClick={submit}
        disabled={isPending || text.trim().length === 0}
      >
        {isPending ? "Validation…" : "Valider l'action"}
      </Button>
      {verdict.kind === "accepted" && (
        <p className="text-xs text-success">✓ Décision ajoutée au trimestre.</p>
      )}
      {verdict.kind === "rejected" && (
        <p className="text-xs text-crit">✗ {verdict.reason}</p>
      )}
    </div>
  );
}
