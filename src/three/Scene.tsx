import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { EmbeddingField } from "./EmbeddingField";
import { detectCapability } from "../lib/capability";

export function Scene() {
  const capability = useMemo(detectCapability, []);
  const [visible, setVisible] = useState(true);

  // Stop rendering entirely when the tab is in the background. A
  // portfolio left open in a spare tab should cost nothing.
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!capability.webgl) {
    return <div className="canvas-fallback" aria-hidden="true" />;
  }

  return (
    <div className="canvas-layer" aria-hidden="true">
      <Canvas
        dpr={[1, capability.maxDpr]}
        camera={{ position: [0, 0, 17], fov: 55 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        frameloop={capability.animate && visible ? "always" : "demand"}
      >
        <EmbeddingField count={capability.count} animate={capability.animate} />
      </Canvas>
    </div>
  );
}
