import { Suspense, lazy, useEffect, useState } from "react";
import { detectCapability } from "../lib/capability";

const Scene = lazy(() => import("./Scene").then((m) => ({ default: m.Scene })));

/**
 * three.js is by far the heaviest thing on this page, and none of it is
 * needed to read the text. So: paint the gradient fallback immediately,
 * then pull the scene in after the browser is idle — and never pull it
 * in at all on machines that can't render it well.
 */
export function LazyScene() {
  const [ready, setReady] = useState(false);
  const [capable] = useState(() => detectCapability().webgl);

  useEffect(() => {
    if (!capable) return;

    const start = () => setReady(true);
    const idle = (
      window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number }
    ).requestIdleCallback;

    if (idle) {
      const handle = idle(start, { timeout: 1500 });
      return () => {
        const cancel = (
          window as Window & { cancelIdleCallback?: (h: number) => void }
        ).cancelIdleCallback;
        cancel?.(handle);
      };
    }

    const timer = window.setTimeout(start, 400);
    return () => window.clearTimeout(timer);
  }, [capable]);

  if (!capable || !ready) {
    return <div className="canvas-fallback" aria-hidden="true" />;
  }

  return (
    <Suspense fallback={<div className="canvas-fallback" aria-hidden="true" />}>
      <Scene />
    </Suspense>
  );
}
