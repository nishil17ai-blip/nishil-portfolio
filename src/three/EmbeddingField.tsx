import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Sphere,
  Vector3,
  type ShaderMaterial,
  type Points,
} from "three";
import { useScene } from "../lib/store";

/**
 * A field of points that starts as an undifferentiated cloud and
 * condenses into labelled clusters as you scroll — the shape of an
 * embedding space going from raw to organised. When the assistant is
 * working, one cluster ignites and the rest dim, which is roughly what
 * a retrieval step looks like if you could see it.
 *
 * Everything is one draw call: positions, cluster targets and per-point
 * seeds are baked into attributes, and the morph happens in the vertex
 * shader. Nothing is recomputed on the CPU per frame.
 */

const CLUSTERS = 6;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uFocus;
  uniform float uEnergy;
  uniform float uSize;
  uniform float uDpr;

  attribute vec3 aTarget;
  attribute float aCluster;
  attribute float aSeed;

  varying float vCluster;
  varying float vFade;

  // Cheap hash-based drift. Deterministic, no texture lookup.
  vec3 drift(float seed, float t) {
    return vec3(
      sin(t * 0.35 + seed * 12.9898),
      cos(t * 0.29 + seed * 78.233),
      sin(t * 0.23 + seed * 45.164)
    );
  }

  void main() {
    float focused = step(0.5, 1.0 - abs(aCluster - uFocus));

    vec3 base = mix(position, aTarget, uMorph);

    // Amplitude falls as points settle, so the cluster state reads as
    // resolved rather than jittery.
    float amp = mix(0.55, 0.14, uMorph) + uEnergy * 0.25 * focused;
    base += drift(aSeed, uTime) * amp;

    // The focused cluster leans very slightly toward the camera.
    base.z += focused * uEnergy * 0.6;

    vec4 mv = modelViewMatrix * vec4(base, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = -mv.z;
    gl_PointSize = uSize * uDpr * (14.0 / max(dist, 0.001));
    gl_PointSize *= 1.0 + focused * uEnergy * 0.8;

    vCluster = aCluster;
    // Depth fade keeps the far side of the cloud from muddying the type.
    vFade = smoothstep(34.0, 5.0, dist);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uFocus;
  uniform float uEnergy;

  varying float vCluster;
  varying float vFade;

  void main() {
    // Round, soft-edged point.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.08, d);

    float focused = step(0.5, 1.0 - abs(vCluster - uFocus));
    float warmth = focused * smoothstep(0.1, 0.85, uEnergy);

    // uCool's blue channel is already near 1.0, so a plain mix(cool, warm)
    // spends its middle range with red rising, blue still pinned high and
    // green lagging behind both — which reads as muddy magenta, not a
    // clean blue-to-amber transition. Carve out exactly that trough.
    vec3 color = mix(uCool, uWarm, warmth);
    float trough = 4.0 * warmth * (1.0 - warmth);
    color.b -= trough * 0.5;
    color = max(color, vec3(0.0));

    // Unfocused points recede while a retrieval is happening.
    float dim = mix(1.0, mix(0.32, 1.0, focused), uEnergy);

    gl_FragColor = vec4(color, alpha * vFade * dim);
  }
`;

export function EmbeddingField({ count, animate }: { count: number; animate: boolean }) {
  const materialRef = useRef<ShaderMaterial>(null);
  const groupRef = useRef<Points>(null);
  const { size } = useThree();

  // Smoothed values, so scroll and chat state never snap.
  const eased = useRef({ morph: 0, focus: 0, energy: 0, x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const clusters = new Float32Array(count);
    const seeds = new Float32Array(count);

    // Cluster centres on a wide ring, tilted so it reads as a volume
    // rather than a flat dial.
    const centres: Vector3[] = [];
    for (let c = 0; c < CLUSTERS; c++) {
      const angle = (c / CLUSTERS) * Math.PI * 2;
      centres.push(
        new Vector3(
          Math.cos(angle) * 7.5,
          Math.sin(angle) * 3.4,
          Math.sin(angle * 1.7) * 3.6,
        ),
      );
    }

    for (let i = 0; i < count; i++) {
      // Diffuse start: uniform inside a sphere.
      const r = 9 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.65;
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Clustered end: tight gaussian-ish blob around a centre.
      const c = i % CLUSTERS;
      const centre = centres[c];
      const spread = 1.5;
      targets[i * 3] = centre.x + (Math.random() - 0.5) * spread * 2;
      targets[i * 3 + 1] = centre.y + (Math.random() - 0.5) * spread * 2;
      targets[i * 3 + 2] = centre.z + (Math.random() - 0.5) * spread * 2;

      clusters[i] = c;
      seeds[i] = Math.random() * 100;
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aTarget", new BufferAttribute(targets, 3));
    geo.setAttribute("aCluster", new BufferAttribute(clusters, 1));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geo.boundingSphere = new Sphere(new Vector3(), 20);
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uFocus: { value: -1 },
      uEnergy: { value: 0 },
      uSize: { value: 7.0 },
      uDpr: { value: 1 },
      uCool: { value: new Color("#4f6bff") },
      uWarm: { value: new Color("#ff9f45") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    const group = groupRef.current;
    if (!material || !group) return;

    const { progress, focus, activity } = useScene.getState();
    const e = eased.current;
    const k = Math.min(delta * 2.4, 1);

    // Morph completes across the first two thirds of the page, so the
    // work section is read against resolved clusters.
    const targetMorph = Math.min(progress / 0.55, 1);
    e.morph += (targetMorph - e.morph) * k;

    const targetFocus = focus < 0 ? e.focus : focus;
    e.focus += (targetFocus - e.focus) * k;

    const targetEnergy = activity === "idle" ? 0 : activity === "thinking" ? 0.55 : 1;
    e.energy += (targetEnergy - e.energy) * Math.min(delta * 1.6, 1);

    material.uniforms.uMorph.value = e.morph;
    material.uniforms.uFocus.value = e.focus;
    material.uniforms.uEnergy.value = e.energy;
    if (animate) material.uniforms.uTime.value = state.clock.elapsedTime;

    // Parallax: the field leans toward the cursor, gently.
    e.x += (pointer.current.x * 0.16 - e.x) * k;
    e.y += (pointer.current.y * 0.1 - e.y) * k;
    group.rotation.y = e.x + state.clock.elapsedTime * (animate ? 0.012 : 0);
    group.rotation.x = -e.y;
  });

  // Pointer tracked on the window, because the canvas itself is
  // pointer-events: none and sits behind the content.
  useMemo(() => {
    if (typeof window === "undefined" || !animate) return;
    const onMove = (ev: PointerEvent) => {
      pointer.current.x = (ev.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (ev.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animate]);

  uniforms.uDpr.value = Math.min(window.devicePixelRatio || 1, 1.75);
  uniforms.uSize.value = size.width < 768 ? 8.5 : 7.0;

  return (
    <points ref={groupRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
