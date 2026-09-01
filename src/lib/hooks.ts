import { useEffect, useRef, useState, useCallback } from "react";
import { useScene } from "./store";

/* Characters used for the "unresolved embedding" noise state - mixed
   case letters, digits and a few symbols so it reads as vector noise
   rather than a plain word scramble. */
const SCRAMBLE_CHARS = "01#$%&ABCDEFGHIJKLMNOPQRSTUVWXYZ01001010+~";

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function scrambleOf(text: string) {
  return text
    .split("")
    .map((ch) => (ch === " " ? " " : randomChar()))
    .join("");
}

/**
 * Renders `text` as resolving vector noise. Idle, it drifts through
 * random characters (an unresolved embedding). Once `active` becomes
 * true it decodes left to right, character by character, over exactly
 * `totalMs`, and then holds the final text permanently - a query
 * resolving against the field, not a toggle.
 */
export function useScramble(text: string, active: boolean, totalMs = 900) {
  const [display, setDisplay] = useState(() => scrambleOf(text));
  const decodedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const idleRef = useRef<number | null>(null);

  useEffect(() => {
    if (decodedRef.current) return;

    if (!active) {
      idleRef.current = window.setInterval(() => setDisplay(scrambleOf(text)), 130);
      return () => {
        if (idleRef.current) clearInterval(idleRef.current);
      };
    }

    if (idleRef.current) clearInterval(idleRef.current);

    const start = performance.now();
    const len = Math.max(text.length, 1);

    const frame = (now: number) => {
      const elapsed = now - start;
      let allDone = true;
      const next = text
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          const finalizeAt = ((i + 1) / len) * totalMs;
          if (elapsed >= finalizeAt) return ch;
          allDone = false;
          return randomChar();
        })
        .join("");
      setDisplay(next);
      if (!allDone) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        decodedRef.current = true;
        setDisplay(text);
      }
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, text, totalMs]);

  return display;
}

/** Trigger-once boolean for hover/focus/tap - decoding is a discovery,
    not a toggle, so it never reverts once fired. */
export function useDecodeTrigger() {
  const [active, setActive] = useState(false);
  const trigger = useCallback(() => setActive(true), []);
  return { active, trigger };
}

/** Fade-and-lift on first entry. Runs once per element. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}

/** Feeds scroll position to the 3D field, throttled to one read per frame. */
export function useScrollProgress() {
  const setProgress = useScene((s) => s.setProgress);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setProgress]);
}

/** Tracks which section is in view, for the nav and the field's focus. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const setFocus = useScene((s) => s.setFocus);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id;
        setActive(id);
        const index = ids.indexOf(id);
        if (index >= 0) setFocus(index % 6);
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0.1, 0.5] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids, setFocus]);

  return active;
}