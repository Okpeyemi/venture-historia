"use client";

import { useState, useTransition } from "react";
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

  const isSubmitting = isPending;

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        Tape une action en français. Le Validator l'interprétera en action
        structurée si elle est légale.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        disabled={isSubmitting}
        placeholder="ex: j'embauche un CTO à 180k pour accélérer la R&D"
        className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting || text.trim().length === 0}
        className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
      >
        {isSubmitting ? "Validation..." : "Valider l'action"}
      </button>
      {verdict.kind === "accepted" && (
        <p className="text-sm text-emerald-400">
          ✓ Décision ajoutée au trimestre.
        </p>
      )}
      {verdict.kind === "rejected" && (
        <p className="text-sm text-red-400">✗ {verdict.reason}</p>
      )}
    </div>
  );
}
