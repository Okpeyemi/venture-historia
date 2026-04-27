"use client";

import { useEffect, useRef, useState } from "react";
import { TUTORIAL_STEPS, TUTORIAL_FLAG_KEY, TUTORIAL_REPLAY_EVENT } from "@/lib/game/ui/tutorial-steps";
import { Button } from "@/components/ui/button";

type Rect = { top: number; left: number; width: number; height: number } | null;

export function TutorialOverlay({ forceOpen = false }: { forceOpen?: boolean }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect>(null);
  const lastStepRef = useRef(0);

  // Mount decision: localStorage flag, unless forceOpen.
  useEffect(() => {
    if (forceOpen) {
      setActive(true);
      setStepIndex(0);
      return;
    }
    try {
      const seen = window.localStorage.getItem(TUTORIAL_FLAG_KEY);
      if (!seen) setActive(true);
    } catch {
      // localStorage unavailable — silently skip the tutorial.
    }
  }, [forceOpen]);

  // Listen for replay events to re-activate even after the flag was set.
  useEffect(() => {
    const onReplay = () => {
      setActive(true);
      setStepIndex(0);
    };
    window.addEventListener(TUTORIAL_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(TUTORIAL_REPLAY_EVENT, onReplay);
  }, []);

  // Compute spotlight rect when step changes.
  useEffect(() => {
    if (!active) return;
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;
    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, stepIndex]);

  // Esc to skip.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finish = () => {
    try {
      window.localStorage.setItem(TUTORIAL_FLAG_KEY, "true");
    } catch {
      // ignore
    }
    setActive(false);
  };

  const next = () => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      finish();
    } else {
      lastStepRef.current = stepIndex;
      setStepIndex(stepIndex + 1);
    }
  };
  const prev = () => setStepIndex(Math.max(0, stepIndex - 1));

  if (!active) return null;
  const step = TUTORIAL_STEPS[stepIndex];
  if (!step) return null;

  // Bubble position: below the spotlight rect, or centered if rect missing.
  const bubbleStyle = rect
    ? {
        top: rect.top + rect.height + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
        maxWidth: 300,
      }
    : { top: 80, left: 80, maxWidth: 300 };

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={`Tutoriel — étape ${stepIndex + 1} sur ${TUTORIAL_STEPS.length}`}
    >
      {/* Dim layer */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Spotlight ring */}
      {rect && (
        <div
          className="absolute rounded-md ring-2 ring-warn shadow-[0_0_30px_rgba(251,146,60,0.35)] pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Bubble */}
      <div
        className="absolute z-50 rounded-md bg-warn text-[#451a03] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        style={bubbleStyle}
      >
        <div className="p-3.5">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#92400e]">
            Étape {stepIndex + 1} sur {TUTORIAL_STEPS.length}
          </div>
          <h4 className="mb-1.5 text-[13px] font-bold">{step.title}</h4>
          <p className="mb-3 text-[12px] leading-[1.5]">{step.body}</p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-[10px] underline text-[#92400e] hover:text-[#451a03]"
            >
              Sauter le tutoriel
            </button>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={stepIndex === 0}
                className="!border-[#92400e] !text-[#451a03]"
              >
                ←
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={next}
                className="!bg-[#451a03] !text-warn"
              >
                {stepIndex === TUTORIAL_STEPS.length - 1 ? "Terminer" : "Suivant →"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
