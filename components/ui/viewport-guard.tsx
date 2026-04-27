"use client";

import { useEffect, useState, type ReactNode } from "react";

const MIN_WIDTH = 1280;

export function ViewportGuard({ children }: { children: ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="mb-3 text-2xl font-bold text-text-primary">
            Écran trop petit
          </h1>
          <p className="text-text-muted">
            Venture Historia se joue sur écran ≥ 1280&nbsp;px de large.
            <br />
            Reviens depuis un ordinateur.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
