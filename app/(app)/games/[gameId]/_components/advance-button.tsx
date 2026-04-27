"use client";

import { useFormStatus } from "react-dom";

export function AdvanceButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-tutorial-target="advance"
      className="rounded-md bg-success px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(16,185,129,0.3)] hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Calcul…" : "Avancer le trimestre →"}
    </button>
  );
}
