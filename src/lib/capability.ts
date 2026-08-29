export interface Capability {
  /** Render the 3D field at all. */
  webgl: boolean;
  /** Animate it, or hold a single static frame. */
  animate: boolean;
  /** How many points to draw. */
  count: number;
  /** Device pixel ratio ceiling. */
  maxDpr: number;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function detectCapability(): Capability {
  if (typeof window === "undefined") {
    return { webgl: false, animate: false, count: 0, maxDpr: 1 };
  }

  const webgl = hasWebGL();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  const weak = cores <= 4 || memory <= 4;
  const mobile = coarse || narrow;

  let count = 6000;
  if (mobile) count = 2200;
  if (weak) count = Math.min(count, 1800);

  return {
    webgl,
    animate: webgl && !reduced,
    count,
    maxDpr: mobile ? 1.5 : 1.75,
  };
}
